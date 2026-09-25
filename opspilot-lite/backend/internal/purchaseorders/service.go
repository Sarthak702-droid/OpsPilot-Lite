package purchaseorders

import (
	"context"
	"errors"
	"regexp"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/database"
)

var ErrInvalid = errors.New("invalid purchase order")
var ErrConflict = errors.New("purchase order conflict")
var ErrNotFound = errors.New("purchase order not found")
var amount = regexp.MustCompile(`^\d{1,12}(\.\d{1,2})?$`)
var quantity = regexp.MustCompile(`^\d{1,12}(\.\d{1,3})?$`)

type LineInput struct {
	ProductID uuid.UUID `json:"product_id"`
	Quantity  string    `json:"quantity"`
	UnitCost  string    `json:"unit_cost"`
}
type Input struct {
	SupplierID   uuid.UUID   `json:"supplier_id"`
	Number       string      `json:"po_number"`
	OrderDate    string      `json:"order_date"`
	ExpectedDate string      `json:"expected_delivery_date"`
	Items        []LineInput `json:"items"`
}
type Line struct {
	ID        uuid.UUID `json:"id"`
	ProductID uuid.UUID `json:"product_id"`
	Product   string    `json:"product"`
	Quantity  string    `json:"quantity"`
	UnitCost  string    `json:"unit_cost"`
	Received  string    `json:"received"`
}
type Item struct {
	ID           uuid.UUID `json:"id"`
	SupplierID   uuid.UUID `json:"supplier_id"`
	Supplier     string    `json:"supplier"`
	Number       string    `json:"po_number"`
	OrderDate    string    `json:"order_date"`
	ExpectedDate *string   `json:"expected_delivery_date"`
	DeliveredAt  *string   `json:"delivered_at"`
	Total        string    `json:"total_amount"`
	Status       string    `json:"status"`
	SendState    string    `json:"send_state"`
	Items        []Line    `json:"items"`
}
type ReceiptInput struct {
	ItemID    uuid.UUID `json:"item_id"`
	Quantity  string    `json:"quantity"`
	Reference string    `json:"reference"`
}
type Service struct{ DB *pgxpool.Pool }

func validate(x Input) error {
	if x.SupplierID == uuid.Nil || len(x.Number) < 1 || len(x.Number) > 100 || len(x.Items) == 0 || len(x.Items) > 100 {
		return ErrInvalid
	}
	if _, err := time.Parse("2006-01-02", x.OrderDate); err != nil {
		return ErrInvalid
	}
	if x.ExpectedDate != "" {
		if _, err := time.Parse("2006-01-02", x.ExpectedDate); err != nil {
			return ErrInvalid
		}
	}
	seen := map[uuid.UUID]bool{}
	for _, line := range x.Items {
		n, err := strconv.ParseFloat(line.Quantity, 64)
		if line.ProductID == uuid.Nil || seen[line.ProductID] || !quantity.MatchString(line.Quantity) || err != nil || n <= 0 || !amount.MatchString(line.UnitCost) {
			return ErrInvalid
		}
		seen[line.ProductID] = true
	}
	return nil
}
func (s Service) Save(ctx context.Context, org, user, poID uuid.UUID, x Input) (uuid.UUID, error) {
	if err := validate(x); err != nil {
		return uuid.Nil, err
	}
	if poID == uuid.Nil {
		poID = uuid.New()
	}
	err := database.WithTx(ctx, s.DB, func(tx pgx.Tx) error {
		var supplier bool
		if err := tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM suppliers WHERE organization_id=$1 AND id=$2)`, org, x.SupplierID).Scan(&supplier); err != nil {
			return err
		}
		if !supplier {
			return ErrInvalid
		}
		var status, sendState string
		err := tx.QueryRow(ctx, `SELECT status,send_state FROM purchase_orders WHERE organization_id=$1 AND id=$2 FOR UPDATE`, org, poID).Scan(&status, &sendState)
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return err
		}
		if err == nil && (status != "DRAFT" || sendState != "NOT_SENT") {
			return ErrConflict
		}
		if err == nil {
			var pending bool
			if err := tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM actions WHERE organization_id=$1 AND action_type='SEND_PURCHASE_ORDER' AND payload->>'purchase_order_id'=$2 AND status IN ('AWAITING_APPROVAL','APPROVED'))`, org, poID.String()).Scan(&pending); err != nil {
				return err
			}
			if pending {
				return ErrConflict
			}
		}
		if err == nil {
			if _, err = tx.Exec(ctx, `DELETE FROM purchase_order_items WHERE organization_id=$1 AND purchase_order_id=$2`, org, poID); err != nil {
				return err
			}
			_, err = tx.Exec(ctx, `UPDATE purchase_orders SET supplier_id=$3,po_number=$4,order_date=$5::date,expected_delivery_date=NULLIF($6,'')::date,updated_at=now() WHERE organization_id=$1 AND id=$2`, org, poID, x.SupplierID, x.Number, x.OrderDate, x.ExpectedDate)
		} else {
			_, err = tx.Exec(ctx, `INSERT INTO purchase_orders(id,organization_id,supplier_id,po_number,order_date,expected_delivery_date,total_amount,status,created_by) VALUES($1,$2,$3,$4,$5::date,NULLIF($6,'')::date,0,'DRAFT',$7)`, poID, org, x.SupplierID, x.Number, x.OrderDate, x.ExpectedDate, user)
		}
		if err != nil {
			return ErrConflict
		}
		for _, line := range x.Items {
			var product bool
			if err := tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM products WHERE organization_id=$1 AND id=$2)`, org, line.ProductID).Scan(&product); err != nil {
				return err
			}
			if !product {
				return ErrInvalid
			}
			_, err = tx.Exec(ctx, `INSERT INTO purchase_order_items(organization_id,purchase_order_id,product_id,quantity,unit_cost) VALUES($1,$2,$3,$4::numeric,$5::numeric)`, org, poID, line.ProductID, line.Quantity, line.UnitCost)
			if err != nil {
				return ErrInvalid
			}
		}
		if _, err = tx.Exec(ctx, `UPDATE purchase_orders SET total_amount=(SELECT COALESCE(SUM(quantity*unit_cost),0) FROM purchase_order_items WHERE organization_id=$1 AND purchase_order_id=$2),updated_at=now() WHERE organization_id=$1 AND id=$2`, org, poID); err != nil {
			return err
		}
		_, err = tx.Exec(ctx, `INSERT INTO audit_logs(organization_id,user_id,action,resource_type,resource_id) VALUES($1,$2,'PURCHASE_ORDER_DRAFT_SAVED','PURCHASE_ORDER',$3)`, org, user, poID)
		return err
	})
	return poID, err
}
func (s Service) List(ctx context.Context, org uuid.UUID) ([]Item, error) {
	rows, err := s.DB.Query(ctx, `SELECT p.id,p.supplier_id,s.name,p.po_number,p.order_date::text,p.expected_delivery_date::text,p.delivered_at::text,p.total_amount::text,p.status,p.send_state FROM purchase_orders p JOIN suppliers s ON s.organization_id=p.organization_id AND s.id=p.supplier_id WHERE p.organization_id=$1 ORDER BY p.order_date DESC,p.id DESC LIMIT 200`, org)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]Item, 0)
	for rows.Next() {
		var x Item
		if err := rows.Scan(&x.ID, &x.SupplierID, &x.Supplier, &x.Number, &x.OrderDate, &x.ExpectedDate, &x.DeliveredAt, &x.Total, &x.Status, &x.SendState); err != nil {
			return nil, err
		}
		items = append(items, x)
	}
	return items, rows.Err()
}
func (s Service) Get(ctx context.Context, org, poID uuid.UUID) (Item, error) {
	var x Item
	err := s.DB.QueryRow(ctx, `SELECT p.id,p.supplier_id,s.name,p.po_number,p.order_date::text,p.expected_delivery_date::text,p.delivered_at::text,p.total_amount::text,p.status,p.send_state FROM purchase_orders p JOIN suppliers s ON s.organization_id=p.organization_id AND s.id=p.supplier_id WHERE p.organization_id=$1 AND p.id=$2`, org, poID).Scan(&x.ID, &x.SupplierID, &x.Supplier, &x.Number, &x.OrderDate, &x.ExpectedDate, &x.DeliveredAt, &x.Total, &x.Status, &x.SendState)
	if errors.Is(err, pgx.ErrNoRows) {
		return x, ErrNotFound
	}
	if err != nil {
		return x, err
	}
	rows, err := s.DB.Query(ctx, `SELECT i.id,i.product_id,p.name,i.quantity::text,i.unit_cost::text,COALESCE(SUM(r.quantity),0)::text FROM purchase_order_items i JOIN products p ON p.organization_id=i.organization_id AND p.id=i.product_id LEFT JOIN purchase_order_receipts r ON r.organization_id=i.organization_id AND r.item_id=i.id WHERE i.organization_id=$1 AND i.purchase_order_id=$2 GROUP BY i.id,p.name ORDER BY p.name`, org, poID)
	if err != nil {
		return x, err
	}
	defer rows.Close()
	x.Items = make([]Line, 0)
	for rows.Next() {
		var line Line
		if err := rows.Scan(&line.ID, &line.ProductID, &line.Product, &line.Quantity, &line.UnitCost, &line.Received); err != nil {
			return x, err
		}
		x.Items = append(x.Items, line)
	}
	return x, rows.Err()
}
func (s Service) Receive(ctx context.Context, org, user, poID uuid.UUID, x ReceiptInput) error {
	n, parseErr := strconv.ParseFloat(x.Quantity, 64)
	if x.ItemID == uuid.Nil || !quantity.MatchString(x.Quantity) || parseErr != nil || n <= 0 || len(x.Reference) < 1 || len(x.Reference) > 100 {
		return ErrInvalid
	}
	return database.WithTx(ctx, s.DB, func(tx pgx.Tx) error {
		var status string
		if err := tx.QueryRow(ctx, `SELECT status FROM purchase_orders WHERE organization_id=$1 AND id=$2 FOR UPDATE`, org, poID).Scan(&status); errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		} else if err != nil {
			return err
		}
		if status != "PENDING" && status != "PARTIAL" {
			return ErrConflict
		}
		var product uuid.UUID
		var available bool
		err := tx.QueryRow(ctx, `SELECT i.product_id,(i.quantity-COALESCE((SELECT SUM(r.quantity) FROM purchase_order_receipts r WHERE r.organization_id=i.organization_id AND r.item_id=i.id),0)) >= $4::numeric FROM purchase_order_items i WHERE i.organization_id=$1 AND i.purchase_order_id=$2 AND i.id=$3 FOR UPDATE`, org, poID, x.ItemID, x.Quantity).Scan(&product, &available)
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrInvalid
		}
		if err != nil {
			return err
		}
		if !available {
			return ErrConflict
		}
		var receipt uuid.UUID
		err = tx.QueryRow(ctx, `INSERT INTO purchase_order_receipts(organization_id,purchase_order_id,item_id,quantity,received_by,reference) VALUES($1,$2,$3,$4::numeric,$5,$6) ON CONFLICT DO NOTHING RETURNING id`, org, poID, x.ItemID, x.Quantity, user, x.Reference).Scan(&receipt)
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrConflict
		}
		if err != nil {
			return err
		}
		if _, err = tx.Exec(ctx, `UPDATE products SET current_stock=current_stock+$3::numeric,updated_at=now() WHERE organization_id=$1 AND id=$2`, org, product, x.Quantity); err != nil {
			return err
		}
		if _, err = tx.Exec(ctx, `INSERT INTO inventory_transactions(organization_id,product_id,transaction_type,quantity,reference_type,reference_id) VALUES($1,$2,'PURCHASE',$3::numeric,'PO_RECEIPT',$4)`, org, product, x.Quantity, receipt); err != nil {
			return err
		}
		_, err = tx.Exec(ctx, `UPDATE purchase_orders p SET status=CASE WHEN NOT EXISTS(SELECT 1 FROM purchase_order_items i WHERE i.organization_id=p.organization_id AND i.purchase_order_id=p.id AND i.quantity>(SELECT COALESCE(SUM(r.quantity),0) FROM purchase_order_receipts r WHERE r.organization_id=i.organization_id AND r.item_id=i.id)) THEN 'DELIVERED' ELSE 'PARTIAL' END,delivered_at=CASE WHEN NOT EXISTS(SELECT 1 FROM purchase_order_items i WHERE i.organization_id=p.organization_id AND i.purchase_order_id=p.id AND i.quantity>(SELECT COALESCE(SUM(r.quantity),0) FROM purchase_order_receipts r WHERE r.organization_id=i.organization_id AND r.item_id=i.id)) THEN CURRENT_DATE ELSE NULL END,updated_at=now() WHERE p.organization_id=$1 AND p.id=$2`, org, poID)
		if err != nil {
			return err
		}
		_, err = tx.Exec(ctx, `INSERT INTO audit_logs(organization_id,user_id,action,resource_type,resource_id,metadata) VALUES($1,$2,'PURCHASE_ORDER_RECEIVED','PURCHASE_ORDER',$3,jsonb_build_object('receipt_id',$4::text,'reference',$5::text))`, org, user, poID, receipt.String(), x.Reference)
		return err
	})
}
func (s Service) RequestSend(ctx context.Context, org, user, poID uuid.UUID) (uuid.UUID, error) {
	var action uuid.UUID
	err := database.WithTx(ctx, s.DB, func(tx pgx.Tx) error {
		var status, state string
		var creator *uuid.UUID
		if err := tx.QueryRow(ctx, `SELECT status,send_state,created_by FROM purchase_orders WHERE organization_id=$1 AND id=$2 FOR UPDATE`, org, poID).Scan(&status, &state, &creator); errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		} else if err != nil {
			return err
		}
		if status != "DRAFT" || state != "NOT_SENT" {
			return ErrConflict
		}
		var ready bool
		if err := tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM purchase_order_items WHERE organization_id=$1 AND purchase_order_id=$2) AND EXISTS(SELECT 1 FROM purchase_orders p JOIN suppliers s ON s.organization_id=p.organization_id AND s.id=p.supplier_id WHERE p.organization_id=$1 AND p.id=$2 AND s.email<>'')`, org, poID).Scan(&ready); err != nil {
			return err
		}
		if !ready {
			return ErrConflict
		}
		if creator != nil {
			user = *creator
		}
		return tx.QueryRow(ctx, `INSERT INTO actions(organization_id,action_type,payload,risk_level,requires_approval,status,requested_by) VALUES($1,'SEND_PURCHASE_ORDER',jsonb_build_object('purchase_order_id',$2::text),'HIGH',true,'AWAITING_APPROVAL',$3) RETURNING id`, org, poID, user).Scan(&action)
	})
	var constraint *pgconn.PgError
	if errors.As(err, &constraint) && constraint.Code == "23505" {
		return uuid.Nil, ErrConflict
	}
	return action, err
}
