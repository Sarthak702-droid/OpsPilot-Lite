package sales

import (
	"context"
	"errors"
	"regexp"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/database"
)

var ErrInvalid = errors.New("invalid sale")
var ErrConflict = errors.New("sale is not an editable draft or stock is insufficient")
var ErrNotFound = errors.New("sale not found")
var decimal = regexp.MustCompile(`^\d{1,12}(\.\d{1,3})?$`)
var money = regexp.MustCompile(`^\d{1,12}(\.\d{1,2})?$`)

type LineInput struct {
	ProductID uuid.UUID `json:"product_id"`
	Quantity  string    `json:"quantity"`
	UnitPrice string    `json:"unit_price"`
	Discount  string    `json:"discount"`
}
type Input struct {
	CustomerID uuid.UUID   `json:"customer_id"`
	SaleDate   string      `json:"sale_date"`
	Tax        string      `json:"tax"`
	Discount   string      `json:"discount"`
	Items      []LineInput `json:"items"`
}
type Item struct {
	ID         uuid.UUID `json:"id"`
	CustomerID uuid.UUID `json:"customer_id"`
	Customer   string    `json:"customer"`
	SaleDate   string    `json:"sale_date"`
	Subtotal   string    `json:"subtotal"`
	Tax        string    `json:"tax"`
	Discount   string    `json:"discount"`
	Total      string    `json:"total_amount"`
	Status     string    `json:"status"`
	Items      []Line    `json:"items"`
}
type Line struct {
	ID        uuid.UUID `json:"id"`
	ProductID uuid.UUID `json:"product_id"`
	Product   string    `json:"product"`
	Quantity  string    `json:"quantity"`
	UnitPrice string    `json:"unit_price"`
	Discount  string    `json:"discount"`
	Total     string    `json:"total"`
}
type Service struct{ DB *pgxpool.Pool }

func validate(x Input) error {
	if x.CustomerID == uuid.Nil || len(x.Items) == 0 || len(x.Items) > 100 {
		return ErrInvalid
	}
	if _, err := time.Parse("2006-01-02", x.SaleDate); err != nil {
		return ErrInvalid
	}
	if !money.MatchString(x.Tax) || !money.MatchString(x.Discount) {
		return ErrInvalid
	}
	seen := map[uuid.UUID]bool{}
	for _, line := range x.Items {
		quantity, err := strconv.ParseFloat(line.Quantity, 64)
		if line.ProductID == uuid.Nil || seen[line.ProductID] || !decimal.MatchString(line.Quantity) || err != nil || quantity <= 0 || !money.MatchString(line.UnitPrice) || !money.MatchString(line.Discount) {
			return ErrInvalid
		}
		seen[line.ProductID] = true
	}
	return nil
}

func (s Service) Save(ctx context.Context, org, user, saleID uuid.UUID, x Input) (uuid.UUID, error) {
	if err := validate(x); err != nil {
		return uuid.Nil, err
	}
	if saleID == uuid.Nil {
		saleID = uuid.New()
	}
	err := database.WithTx(ctx, s.DB, func(tx pgx.Tx) error {
		var exists bool
		if err := tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM customers WHERE organization_id=$1 AND id=$2)`, org, x.CustomerID).Scan(&exists); err != nil {
			return err
		}
		if !exists {
			return ErrInvalid
		}
		var status string
		err := tx.QueryRow(ctx, `SELECT status FROM sales WHERE organization_id=$1 AND id=$2 FOR UPDATE`, org, saleID).Scan(&status)
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return err
		}
		if err == nil && status != "DRAFT" {
			return ErrConflict
		}
		if err == nil {
			if _, err = tx.Exec(ctx, `DELETE FROM sale_items WHERE organization_id=$1 AND sale_id=$2`, org, saleID); err != nil {
				return err
			}
			_, err = tx.Exec(ctx, `UPDATE sales SET customer_id=$3,sale_date=$4::date,tax=$5::numeric,discount=$6::numeric,updated_at=now() WHERE organization_id=$1 AND id=$2`, org, saleID, x.CustomerID, x.SaleDate, x.Tax, x.Discount)
		} else {
			_, err = tx.Exec(ctx, `INSERT INTO sales(id,organization_id,customer_id,sale_date,subtotal,tax,discount,total_amount,status,created_by) VALUES($1,$2,$3,$4::date,0,$5::numeric,$6::numeric,0,'DRAFT',$7)`, saleID, org, x.CustomerID, x.SaleDate, x.Tax, x.Discount, user)
		}
		if err != nil {
			return err
		}
		for _, line := range x.Items {
			var productExists bool
			if err := tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM products WHERE organization_id=$1 AND id=$2)`, org, line.ProductID).Scan(&productExists); err != nil {
				return err
			}
			if !productExists {
				return ErrInvalid
			}
			_, err = tx.Exec(ctx, `INSERT INTO sale_items(organization_id,sale_id,product_id,quantity,unit_price,discount,total) VALUES($1,$2,$3,$4::numeric,$5::numeric,$6::numeric,round($4::numeric*$5::numeric-$6::numeric,2))`, org, saleID, line.ProductID, line.Quantity, line.UnitPrice, line.Discount)
			if err != nil {
				return ErrInvalid
			}
		}
		var total string
		if err := tx.QueryRow(ctx, `UPDATE sales SET subtotal=(SELECT COALESCE(SUM(total),0) FROM sale_items WHERE organization_id=$1 AND sale_id=$2),total_amount=(SELECT COALESCE(SUM(total),0) FROM sale_items WHERE organization_id=$1 AND sale_id=$2)+tax-discount WHERE organization_id=$1 AND id=$2 AND (SELECT COALESCE(SUM(total),0) FROM sale_items WHERE organization_id=$1 AND sale_id=$2)+tax-discount>=0 RETURNING total_amount::text`, org, saleID).Scan(&total); err != nil {
			return ErrInvalid
		}
		_, err = tx.Exec(ctx, `INSERT INTO audit_logs(organization_id,user_id,action,resource_type,resource_id,metadata) VALUES($1,$2,'SALE_DRAFT_SAVED','SALE',$3,jsonb_build_object('total',$4::text))`, org, user, saleID, total)
		return err
	})
	return saleID, err
}

func (s Service) Complete(ctx context.Context, org, user, saleID uuid.UUID) error {
	return database.WithTx(ctx, s.DB, func(tx pgx.Tx) error {
		var status string
		if err := tx.QueryRow(ctx, `SELECT status FROM sales WHERE organization_id=$1 AND id=$2 FOR UPDATE`, org, saleID).Scan(&status); errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		} else if err != nil {
			return err
		}
		if status != "DRAFT" {
			return ErrConflict
		}
		rows, err := tx.Query(ctx, `SELECT product_id,quantity::text FROM sale_items WHERE organization_id=$1 AND sale_id=$2 ORDER BY product_id`, org, saleID)
		if err != nil {
			return err
		}
		type movement struct {
			product  uuid.UUID
			quantity string
		}
		var movements []movement
		for rows.Next() {
			var m movement
			if err := rows.Scan(&m.product, &m.quantity); err != nil {
				rows.Close()
				return err
			}
			movements = append(movements, m)
		}
		err = rows.Err()
		rows.Close()
		if err != nil {
			return err
		}
		if len(movements) == 0 {
			return ErrInvalid
		}
		for _, m := range movements {
			var changed uuid.UUID
			err = tx.QueryRow(ctx, `UPDATE products SET current_stock=current_stock-$3::numeric,updated_at=now() WHERE organization_id=$1 AND id=$2 AND current_stock >= $3::numeric RETURNING id`, org, m.product, m.quantity).Scan(&changed)
			if errors.Is(err, pgx.ErrNoRows) {
				return ErrConflict
			}
			if err != nil {
				return err
			}
			_, err = tx.Exec(ctx, `INSERT INTO inventory_transactions(organization_id,product_id,transaction_type,quantity,reference_type,reference_id) VALUES($1,$2,'SALE',$3::numeric,'SALE',$4)`, org, m.product, m.quantity, saleID)
			if err != nil {
				return err
			}
		}
		if _, err = tx.Exec(ctx, `UPDATE sales SET status='COMPLETED',updated_at=now() WHERE organization_id=$1 AND id=$2`, org, saleID); err != nil {
			return err
		}
		_, err = tx.Exec(ctx, `INSERT INTO audit_logs(organization_id,user_id,action,resource_type,resource_id) VALUES($1,$2,'SALE_COMPLETED','SALE',$3)`, org, user, saleID)
		return err
	})
}

func (s Service) List(ctx context.Context, org uuid.UUID) ([]Item, error) {
	rows, err := s.DB.Query(ctx, `SELECT s.id,s.customer_id,COALESCE(NULLIF(c.business_name,''),c.name,''),s.sale_date::text,s.subtotal::text,s.tax::text,s.discount::text,s.total_amount::text,s.status FROM sales s LEFT JOIN customers c ON c.organization_id=s.organization_id AND c.id=s.customer_id WHERE s.organization_id=$1 ORDER BY s.sale_date DESC,s.id DESC LIMIT 200`, org)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]Item, 0)
	for rows.Next() {
		var x Item
		if err := rows.Scan(&x.ID, &x.CustomerID, &x.Customer, &x.SaleDate, &x.Subtotal, &x.Tax, &x.Discount, &x.Total, &x.Status); err != nil {
			return nil, err
		}
		out = append(out, x)
	}
	return out, rows.Err()
}

func (s Service) Get(ctx context.Context, org, saleID uuid.UUID) (Item, error) {
	var x Item
	err := s.DB.QueryRow(ctx, `SELECT s.id,s.customer_id,COALESCE(NULLIF(c.business_name,''),c.name,''),s.sale_date::text,s.subtotal::text,s.tax::text,s.discount::text,s.total_amount::text,s.status FROM sales s LEFT JOIN customers c ON c.organization_id=s.organization_id AND c.id=s.customer_id WHERE s.organization_id=$1 AND s.id=$2`, org, saleID).Scan(&x.ID, &x.CustomerID, &x.Customer, &x.SaleDate, &x.Subtotal, &x.Tax, &x.Discount, &x.Total, &x.Status)
	if errors.Is(err, pgx.ErrNoRows) {
		return x, ErrNotFound
	}
	if err != nil {
		return x, err
	}
	rows, err := s.DB.Query(ctx, `SELECT i.id,i.product_id,p.name,i.quantity::text,i.unit_price::text,i.discount::text,i.total::text FROM sale_items i JOIN products p ON p.organization_id=i.organization_id AND p.id=i.product_id WHERE i.organization_id=$1 AND i.sale_id=$2 ORDER BY p.name`, org, saleID)
	if err != nil {
		return x, err
	}
	defer rows.Close()
	x.Items = make([]Line, 0)
	for rows.Next() {
		var line Line
		if err := rows.Scan(&line.ID, &line.ProductID, &line.Product, &line.Quantity, &line.UnitPrice, &line.Discount, &line.Total); err != nil {
			return x, err
		}
		x.Items = append(x.Items, line)
	}
	return x, rows.Err()
}
