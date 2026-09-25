package importer

import (
	"context"
	"encoding/csv"
	"errors"
	"fmt"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/database"
	"github.com/xuri/excelize/v2"
	"io"
	"math"
	"strconv"
	"strings"
)

type Service struct{ DB *pgxpool.Pool }
type Result struct {
	Imported int    `json:"imported"`
	Type     string `json:"type"`
}

func (s Service) ImportCSV(ctx context.Context, org uuid.UUID, kind string, reader io.Reader, mapping map[string]string) (Result, error) {
	csvReader := csv.NewReader(io.LimitReader(reader, 10<<20))
	csvReader.FieldsPerRecord = -1
	rows, err := csvReader.ReadAll()
	if err != nil {
		return Result{}, fmt.Errorf("parse CSV: %w", err)
	}
	return s.ImportRows(ctx, org, kind, rows, mapping)
}
func (s Service) ImportXLSX(ctx context.Context, org uuid.UUID, kind string, reader io.Reader, mapping map[string]string) (Result, error) {
	file, err := excelize.OpenReader(io.LimitReader(reader, 10<<20), excelize.Options{UnzipSizeLimit: 20 << 20, UnzipXMLSizeLimit: 10 << 20})
	if err != nil {
		return Result{}, errors.New("invalid XLSX workbook")
	}
	defer file.Close()
	sheets := file.GetSheetList()
	if len(sheets) == 0 {
		return Result{}, errors.New("XLSX has no worksheets")
	}
	rows, err := file.GetRows(sheets[0])
	if err != nil {
		return Result{}, errors.New("could not read XLSX rows")
	}
	return s.ImportRows(ctx, org, kind, rows, mapping)
}
func (s Service) ImportRows(ctx context.Context, org uuid.UUID, kind string, rows [][]string, mapping map[string]string) (Result, error) {
	if !oneOf(kind, "products", "customers", "suppliers", "invoices", "inventory_transactions", "purchase_orders", "sales", "payments") {
		return Result{}, errors.New("unsupported import type")
	}
	if len(rows) < 2 {
		return Result{}, errors.New("file must contain a header and at least one row")
	}
	if len(rows) > 5001 {
		return Result{}, errors.New("file row limit is 5000")
	}
	cols := make(map[string]int)
	for i, h := range rows[0] {
		cols[strings.ToLower(strings.TrimSpace(h))] = i
	}
	canonical := required(kind)
	for _, field := range canonical {
		source := mapping[field]
		if source == "" {
			source = field
		}
		if _, ok := cols[strings.ToLower(source)]; !ok {
			return Result{}, fmt.Errorf("missing mapped column %s", field)
		}
	}
	get := func(row []string, field string) string {
		source := mapping[field]
		if source == "" {
			source = field
		}
		index, ok := cols[strings.ToLower(source)]
		if !ok || index >= len(row) {
			return ""
		}
		return strings.TrimSpace(row[index])
	}
	for n, row := range rows[1:] {
		for _, field := range canonical {
			if get(row, field) == "" {
				return Result{}, fmt.Errorf("row %d: %s required", n+2, field)
			}
		}
		switch kind {
		case "products":
			if err := positiveNumber(get(row, "current_stock")); err != nil {
				return Result{}, fmt.Errorf("row %d stock: %w", n+2, err)
			}
		case "invoices":
			if err := positiveNumber(get(row, "total")); err != nil {
				return Result{}, fmt.Errorf("row %d total: %w", n+2, err)
			}
		case "inventory_transactions":
			if err := positiveNumber(get(row, "quantity")); err != nil {
				return Result{}, fmt.Errorf("row %d quantity: %w", n+2, err)
			}
			if !oneOf(get(row, "transaction_type"), "SALE", "PURCHASE", "RETURN", "ADJUSTMENT", "DAMAGE") {
				return Result{}, fmt.Errorf("row %d invalid transaction type", n+2)
			}
		case "purchase_orders":
			if !oneOf(get(row, "status"), "DRAFT", "PENDING", "PARTIAL", "DELIVERED", "CANCELLED") {
				return Result{}, fmt.Errorf("row %d invalid purchase order status", n+2)
			}
			if get(row, "status") == "DELIVERED" && get(row, "delivered_at") == "" {
				return Result{}, fmt.Errorf("row %d delivered_at required", n+2)
			}
		case "sales":
			if err := positiveNumber(get(row, "total_amount")); err != nil {
				return Result{}, fmt.Errorf("row %d total: %w", n+2, err)
			}
		case "payments":
			if err := positiveNumber(get(row, "amount")); err != nil {
				return Result{}, fmt.Errorf("row %d amount: %w", n+2, err)
			}
			if amount, _ := strconv.ParseFloat(get(row, "amount"), 64); amount <= 0 {
				return Result{}, fmt.Errorf("row %d amount must be positive", n+2)
			}
		}
	}
	err := database.WithTx(ctx, s.DB, func(tx pgx.Tx) error {
		for n, row := range rows[1:] {
			var err error
			switch kind {
			case "products":
				_, err = tx.Exec(ctx, `INSERT INTO products(organization_id,sku,name,current_stock) VALUES($1,$2,$3,$4) ON CONFLICT(organization_id,sku) DO UPDATE SET name=EXCLUDED.name,current_stock=EXCLUDED.current_stock,updated_at=now()`, org, get(row, "sku"), get(row, "name"), get(row, "current_stock"))
			case "customers":
				_, err = tx.Exec(ctx, `INSERT INTO customers(organization_id,name,business_name,email) VALUES($1,$2,$3,$4)`, org, get(row, "name"), get(row, "business_name"), get(row, "email"))
			case "suppliers":
				_, err = tx.Exec(ctx, `INSERT INTO suppliers(organization_id,name,email) VALUES($1,$2,$3)`, org, get(row, "name"), get(row, "email"))
			case "invoices":
				customer, parseErr := uuid.Parse(get(row, "customer_id"))
				if parseErr != nil {
					return fmt.Errorf("row %d customer_id: %w", n+2, parseErr)
				}
				_, err = tx.Exec(ctx, `INSERT INTO invoices(organization_id,customer_id,invoice_number,invoice_date,due_date,total,status) VALUES($1,$2,$3,$4::date,$5::date,$6,'PENDING') ON CONFLICT(organization_id,invoice_number) DO UPDATE SET due_date=EXCLUDED.due_date,total=EXCLUDED.total,updated_at=now()`, org, customer, get(row, "invoice_number"), get(row, "invoice_date"), get(row, "due_date"), get(row, "total"))
			case "inventory_transactions":
				var productID uuid.UUID
				if err = tx.QueryRow(ctx, `SELECT id FROM products WHERE organization_id=$1 AND sku=$2`, org, get(row, "product_sku")).Scan(&productID); err != nil {
					return fmt.Errorf("row %d product SKU not found", n+2)
				}
				id := uuid.NewSHA1(org, []byte("inventory:"+get(row, "source_id")))
				_, err = tx.Exec(ctx, `INSERT INTO inventory_transactions(id,organization_id,product_id,transaction_type,quantity,reference_type,reference_id,timestamp) VALUES($1,$2,$3,$4,$5,'IMPORT',$1,$6::timestamptz) ON CONFLICT(id) DO NOTHING`, id, org, productID, get(row, "transaction_type"), get(row, "quantity"), get(row, "timestamp"))
			case "purchase_orders":
				supplierID, parseErr := uuid.Parse(get(row, "supplier_id"))
				if parseErr != nil {
					return fmt.Errorf("row %d invalid supplier_id", n+2)
				}
				_, err = tx.Exec(ctx, `INSERT INTO purchase_orders(organization_id,supplier_id,po_number,order_date,expected_delivery_date,delivered_at,total_amount,status) VALUES($1,$2,$3,$4::date,$5::date,NULLIF($6,'')::date,0,$7) ON CONFLICT(organization_id,po_number) DO UPDATE SET expected_delivery_date=EXCLUDED.expected_delivery_date,delivered_at=EXCLUDED.delivered_at,status=EXCLUDED.status,updated_at=now()`, org, supplierID, get(row, "po_number"), get(row, "order_date"), get(row, "expected_delivery_date"), get(row, "delivered_at"), get(row, "status"))
			case "sales":
				customerID, parseErr := uuid.Parse(get(row, "customer_id"))
				if parseErr != nil {
					return fmt.Errorf("row %d invalid customer_id", n+2)
				}
				id := uuid.NewSHA1(org, []byte("sale:"+get(row, "source_id")))
				_, err = tx.Exec(ctx, `INSERT INTO sales(id,organization_id,customer_id,sale_date,subtotal,total_amount,status) VALUES($1,$2,$3,$4::date,$5,$5,'COMPLETED') ON CONFLICT(id) DO NOTHING`, id, org, customerID, get(row, "sale_date"), get(row, "total_amount"))
			case "payments":
				var invoiceID, customerID uuid.UUID
				if err = tx.QueryRow(ctx, `SELECT id,customer_id FROM invoices WHERE organization_id=$1 AND invoice_number=$2 AND status NOT IN ('DRAFT','CANCELLED') FOR UPDATE`, org, get(row, "invoice_number")).Scan(&invoiceID, &customerID); err != nil {
					return fmt.Errorf("row %d invoice not found", n+2)
				}
				amount, parseErr := strconv.ParseFloat(get(row, "amount"), 64)
				if parseErr != nil || amount <= 0 {
					return fmt.Errorf("row %d invalid amount", n+2)
				}
				var exists bool
				if err = tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM payments WHERE organization_id=$1 AND reference_number=$2)`, org, get(row, "reference_number")).Scan(&exists); err != nil {
					return err
				}
				if exists {
					continue
				}
				_, err = tx.Exec(ctx, `INSERT INTO payments(organization_id,customer_id,invoice_id,amount,payment_method,payment_date,reference_number) VALUES($1,$2,$3,$4,'IMPORT',$5::date,$6)`, org, customerID, invoiceID, get(row, "amount"), get(row, "payment_date"), get(row, "reference_number"))
				if err != nil {
					return fmt.Errorf("row %d invalid payment", n+2)
				}
				var updated uuid.UUID
				err = tx.QueryRow(ctx, `UPDATE invoices SET paid_amount=paid_amount+$1::numeric,status=CASE WHEN paid_amount+$1::numeric>=total THEN 'PAID' ELSE 'PARTIAL' END,updated_at=now() WHERE organization_id=$2 AND id=$3 AND outstanding_amount >= $1::numeric RETURNING id`, get(row, "amount"), org, invoiceID).Scan(&updated)
				if err == pgx.ErrNoRows {
					return fmt.Errorf("row %d payment exceeds outstanding amount", n+2)
				}
			}
			if err != nil {
				return fmt.Errorf("row %d has invalid values or references", n+2)
			}
		}
		return nil
	})
	if err != nil {
		return Result{}, err
	}
	return Result{Imported: len(rows) - 1, Type: kind}, nil
}
func required(kind string) []string {
	switch kind {
	case "products":
		return []string{"sku", "name", "current_stock"}
	case "customers", "suppliers":
		return []string{"name"}
	case "invoices":
		return []string{"customer_id", "invoice_number", "invoice_date", "due_date", "total"}
	case "inventory_transactions":
		return []string{"source_id", "product_sku", "transaction_type", "quantity", "timestamp"}
	case "purchase_orders":
		return []string{"supplier_id", "po_number", "order_date", "expected_delivery_date", "status"}
	case "sales":
		return []string{"source_id", "customer_id", "sale_date", "total_amount"}
	case "payments":
		return []string{"reference_number", "invoice_number", "payment_date", "amount"}
	}
	return nil
}
func positiveNumber(v string) error {
	x, err := strconv.ParseFloat(v, 64)
	if err != nil || x < 0 || math.IsNaN(x) || math.IsInf(x, 0) {
		return errors.New("must be a nonnegative number")
	}
	return nil
}
func oneOf(v string, allowed ...string) bool {
	for _, a := range allowed {
		if v == a {
			return true
		}
	}
	return false
}
