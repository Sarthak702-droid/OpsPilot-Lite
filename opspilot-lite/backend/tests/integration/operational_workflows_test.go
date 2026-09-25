package integration

import (
	"context"
	"errors"
	"os"
	"strconv"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/inventory"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/payments"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/purchaseorders"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/sales"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/signals"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/suppliers"
)

type captureMailer struct {
	to, subject, body string
	err               error
}

func (m *captureMailer) Send(_ context.Context, to, subject, body string) error {
	m.to = to
	m.subject = subject
	m.body = body
	return m.err
}

func TestSalesPurchaseOrdersAndPaymentReversal(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("set TEST_DATABASE_URL")
	}
	ctx := context.Background()
	db, err := pgxpool.New(ctx, url)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	org, user, approver, customer, supplier, product := uuid.New(), uuid.New(), uuid.New(), uuid.New(), uuid.New(), uuid.New()
	_, err = db.Exec(ctx, `INSERT INTO organizations(id,name) VALUES($1,'Workflow test')`, org)
	if err != nil {
		t.Fatal(err)
	}
	defer func() {
		for _, table := range []string{"audit_logs", "actions", "business_signals", "purchase_order_receipts", "inventory_transactions", "purchase_order_items", "purchase_orders", "sale_items", "sales", "payments", "invoices", "products", "suppliers", "customers", "users", "organization_settings", "organizations"} {
			column := "organization_id"
			if table == "organizations" {
				column = "id"
			}
			_, _ = db.Exec(ctx, "DELETE FROM "+table+" WHERE "+column+"=$1", org)
		}
	}()
	for _, row := range []struct {
		query string
		args  []any
	}{
		{`INSERT INTO users(id,organization_id,clerk_user_id,role) VALUES($1,$2,$3,'OWNER')`, []any{user, org, "workflow-" + user.String()}},
		{`INSERT INTO users(id,organization_id,clerk_user_id,role) VALUES($1,$2,$3,'MANAGER')`, []any{approver, org, "workflow-" + approver.String()}},
		{`INSERT INTO customers(id,organization_id,name) VALUES($1,$2,'Customer')`, []any{customer, org}},
		{`INSERT INTO suppliers(id,organization_id,name,email) VALUES($1,$2,'Supplier','supplier@example.com')`, []any{supplier, org}},
		{`INSERT INTO products(id,organization_id,sku,name,current_stock,selling_price,cost_price,preferred_supplier_id) VALUES($1,$2,'WF-1','Product',10,5,2,$3)`, []any{product, org, supplier}},
	} {
		if _, err := db.Exec(ctx, row.query, row.args...); err != nil {
			t.Fatal(err)
		}
	}
	salesService := sales.Service{DB: db}
	saleID, err := salesService.Save(ctx, org, user, uuid.Nil, sales.Input{CustomerID: customer, SaleDate: "2026-09-25", Tax: "0", Discount: "0", Items: []sales.LineInput{{ProductID: product, Quantity: "3", UnitPrice: "5", Discount: "0"}}})
	if err != nil {
		t.Fatalf("save sale: %v", err)
	}
	if err := salesService.Complete(ctx, org, user, saleID); err != nil {
		t.Fatalf("complete sale: %v", err)
	}
	if _, err := salesService.Get(ctx, uuid.New(), saleID); !errors.Is(err, sales.ErrNotFound) {
		t.Fatalf("cross-tenant sale lookup: %v", err)
	}
	if err := salesService.Complete(ctx, org, user, saleID); !errors.Is(err, sales.ErrConflict) {
		t.Fatalf("duplicate sale completion: %v", err)
	}
	var stock, total float64
	var movements int
	if err := db.QueryRow(ctx, `SELECT current_stock::float8 FROM products WHERE organization_id=$1 AND id=$2`, org, product).Scan(&stock); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow(ctx, `SELECT total_amount::float8 FROM sales WHERE organization_id=$1 AND id=$2`, org, saleID).Scan(&total); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow(ctx, `SELECT count(*) FROM inventory_transactions WHERE organization_id=$1 AND reference_type='SALE' AND reference_id=$2`, org, saleID).Scan(&movements); err != nil {
		t.Fatal(err)
	}
	if stock != 7 || total != 15 || movements != 1 {
		t.Fatalf("sale stock=%v total=%v movements=%d", stock, total, movements)
	}
	orders := purchaseorders.Service{DB: db}
	poID, err := orders.Save(ctx, org, user, uuid.Nil, purchaseorders.Input{SupplierID: supplier, Number: "WF-PO-1", OrderDate: "2026-09-25", Items: []purchaseorders.LineInput{{ProductID: product, Quantity: "4", UnitCost: "2"}}})
	if err != nil {
		t.Fatalf("save PO: %v", err)
	}
	if _, err := orders.Get(ctx, uuid.New(), poID); !errors.Is(err, purchaseorders.ErrNotFound) {
		t.Fatalf("cross-tenant purchase order lookup: %v", err)
	}
	actionID, err := orders.RequestSend(ctx, org, user, poID)
	if err != nil {
		t.Fatalf("request send: %v", err)
	}
	if _, err := orders.RequestSend(ctx, org, user, poID); !errors.Is(err, purchaseorders.ErrConflict) {
		t.Fatalf("duplicate send request: %v", err)
	}
	if _, err := db.Exec(ctx, `UPDATE actions SET status='APPROVED',approved_by=$3 WHERE organization_id=$1 AND id=$2`, org, actionID, user); err != nil {
		t.Fatal(err)
	}
	mailer := &captureMailer{}
	if err := orders.Send(ctx, org, user, actionID, mailer); !errors.Is(err, purchaseorders.ErrConflict) {
		t.Fatalf("self approval sent: %v", err)
	}
	if _, err := db.Exec(ctx, `UPDATE actions SET approved_by=$3 WHERE organization_id=$1 AND id=$2`, org, actionID, approver); err != nil {
		t.Fatal(err)
	}
	if err := orders.Send(ctx, org, user, actionID, mailer); err != nil {
		t.Fatalf("send approved PO: %v", err)
	}
	if mailer.to != "supplier@example.com" || mailer.subject != "Purchase order WF-PO-1" {
		t.Fatalf("unexpected supplier message: %+v", mailer)
	}
	order, err := orders.Get(ctx, org, poID)
	if err != nil {
		t.Fatal(err)
	}
	receipt := purchaseorders.ReceiptInput{ItemID: order.Items[0].ID, Quantity: "4", Reference: "delivery-1"}
	if err := orders.Receive(ctx, org, user, poID, receipt); err != nil {
		t.Fatalf("receive PO: %v", err)
	}
	if err := orders.Receive(ctx, org, user, poID, receipt); !errors.Is(err, purchaseorders.ErrConflict) {
		t.Fatalf("duplicate receipt: %v", err)
	}
	order, err = orders.Get(ctx, org, poID)
	if err != nil {
		t.Fatal(err)
	}
	received, parseErr := strconv.ParseFloat(order.Items[0].Received, 64)
	if parseErr != nil || order.Status != "DELIVERED" || received != 4 {
		t.Fatalf("received order: %+v", order)
	}
	if err := db.QueryRow(ctx, `SELECT current_stock::float8 FROM products WHERE organization_id=$1 AND id=$2`, org, product).Scan(&stock); err != nil {
		t.Fatal(err)
	}
	if stock != 11 {
		t.Fatalf("stock after receipt=%v", stock)
	}
	uncertainID, err := orders.Save(ctx, org, user, uuid.Nil, purchaseorders.Input{SupplierID: supplier, Number: "WF-PO-2", OrderDate: "2026-09-25", Items: []purchaseorders.LineInput{{ProductID: product, Quantity: "1", UnitCost: "2"}}})
	if err != nil {
		t.Fatal(err)
	}
	uncertainAction, err := orders.RequestSend(ctx, org, user, uncertainID)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(ctx, `UPDATE actions SET status='APPROVED',approved_by=$3 WHERE organization_id=$1 AND id=$2`, org, uncertainAction, approver); err != nil {
		t.Fatal(err)
	}
	failure := &captureMailer{err: errors.New("network outcome unknown")}
	if err := orders.Send(ctx, org, user, uncertainAction, failure); err == nil {
		t.Fatal("send failure was accepted")
	}
	uncertainOrder, err := orders.Get(ctx, org, uncertainID)
	if err != nil {
		t.Fatal(err)
	}
	if uncertainOrder.SendState != "UNCERTAIN" {
		t.Fatalf("send state=%s", uncertainOrder.SendState)
	}
	if err := orders.ResolveSend(ctx, org, user, uncertainID, "NOT_SENT"); err != nil {
		t.Fatal(err)
	}
	if _, err := orders.RequestSend(ctx, org, user, uncertainID); err != nil {
		t.Fatalf("new approval after confirmed not sent: %v", err)
	}
	var invoice uuid.UUID
	if err := db.QueryRow(ctx, `INSERT INTO invoices(organization_id,customer_id,invoice_number,invoice_date,due_date,total,status) VALUES($1,$2,'WF-INV-1',CURRENT_DATE,CURRENT_DATE+7,100,'PENDING') RETURNING id`, org, customer).Scan(&invoice); err != nil {
		t.Fatal(err)
	}
	pay := payments.Service{DB: db}
	paymentID, err := pay.Record(ctx, org, user, payments.Input{InvoiceID: invoice, Amount: "40", PaymentDate: "2026-09-25", Method: "BANK", Reference: "WF-PAY-1"})
	if err != nil {
		t.Fatalf("record payment: %v", err)
	}
	if _, err := pay.Record(ctx, uuid.New(), user, payments.Input{InvoiceID: invoice, Amount: "1", PaymentDate: "2026-09-25", Method: "BANK", Reference: "WF-PAY-CROSS"}); !errors.Is(err, payments.ErrNotFound) {
		t.Fatalf("cross-tenant payment: %v", err)
	}
	if err := pay.Reverse(ctx, org, user, paymentID, "Wrong amount"); err != nil {
		t.Fatalf("reverse payment: %v", err)
	}
	if err := pay.Reverse(ctx, org, user, paymentID, "Again"); !errors.Is(err, payments.ErrConflict) {
		t.Fatalf("duplicate reversal: %v", err)
	}
	if err := db.QueryRow(ctx, `SELECT outstanding_amount::float8 FROM invoices WHERE organization_id=$1 AND id=$2`, org, invoice).Scan(&total); err != nil {
		t.Fatal(err)
	}
	if total != 100 {
		t.Fatalf("outstanding after reversal=%v", total)
	}
	if _, err := db.Exec(ctx, `UPDATE products SET current_stock=100 WHERE organization_id=$1 AND id=$2`, org, product); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(ctx, `INSERT INTO organization_settings(organization_id,overstock_days,high_value_threshold) VALUES($1,90,50)`, org); err != nil {
		t.Fatal(err)
	}
	engine := signals.Engine{DB: db, Repository: signals.Repository{DB: db}, Inventory: inventory.Service{DB: db}, Suppliers: suppliers.Service{DB: db}}
	if err := engine.RunOrganization(ctx, org); err != nil {
		t.Fatalf("signal refresh: %v", err)
	}
	for _, kind := range []string{"OVERSTOCK", "HIGH_VALUE_PAYMENT_PENDING"} {
		var count int
		if err := db.QueryRow(ctx, `SELECT count(*) FROM business_signals WHERE organization_id=$1 AND signal_type=$2 AND status='ACTIVE'`, org, kind).Scan(&count); err != nil {
			t.Fatal(err)
		}
		if count != 1 {
			t.Fatalf("active %s signals=%d", kind, count)
		}
	}
}
