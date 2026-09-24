package integration

import (
	"context"
	"fmt"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/ai"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/importer"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/inventory"
	"os"
	"strings"
	"testing"
)

func TestTenantIsolation(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("set TEST_DATABASE_URL to run PostgreSQL integration tests")
	}
	ctx := context.Background()
	db, err := pgxpool.New(ctx, url)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	orgA, orgB, productB := uuid.New(), uuid.New(), uuid.New()
	for _, org := range []uuid.UUID{orgA, orgB} {
		if _, err := db.Exec(ctx, `INSERT INTO organizations(id,name) VALUES($1,$2)`, org, "Tenant test"); err != nil {
			t.Fatal(err)
		}
	}
	defer func() {
		db.Exec(ctx, `DELETE FROM products WHERE organization_id IN ($1,$2)`, orgA, orgB)
		db.Exec(ctx, `DELETE FROM organizations WHERE id IN ($1,$2)`, orgA, orgB)
	}()
	if _, err := db.Exec(ctx, `INSERT INTO products(id,organization_id,sku,name) VALUES($1,$2,'SECRET','Tenant B product')`, productB, orgB); err != nil {
		t.Fatal(err)
	}
	items, err := inventory.Service{DB: db}.List(ctx, orgA)
	if err != nil {
		t.Fatal(err)
	}
	if len(items) != 0 {
		t.Fatalf("tenant A saw %d products from B", len(items))
	}
	if _, err := db.Exec(ctx, `INSERT INTO inventory_transactions(organization_id,product_id,transaction_type,quantity) VALUES($1,$2,'SALE',1)`, orgA, productB); err == nil {
		t.Fatal("cross-tenant foreign key was accepted")
	}
}
func TestXLSXImport(t *testing.T) {
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
	org := uuid.New()
	if _, err := db.Exec(ctx, `INSERT INTO organizations(id,name) VALUES($1,'XLSX import test')`, org); err != nil {
		t.Fatal(err)
	}
	defer func() {
		db.Exec(ctx, `DELETE FROM products WHERE organization_id=$1`, org)
		db.Exec(ctx, `DELETE FROM organizations WHERE id=$1`, org)
	}()
	file, err := os.Open("../../../testdata/xlsx/demo-business-data.xlsx")
	if err != nil {
		t.Fatal(err)
	}
	defer file.Close()
	result, err := importer.Service{DB: db}.ImportXLSX(ctx, org, "products", file, nil)
	if err != nil {
		t.Fatal(err)
	}
	if result.Imported != 2 {
		t.Fatalf("imported=%d", result.Imported)
	}
	var stock float64
	if err := db.QueryRow(ctx, `SELECT current_stock::float8 FROM products WHERE organization_id=$1 AND sku='SKU-001'`, org).Scan(&stock); err != nil {
		t.Fatal(err)
	}
	if stock != 80 {
		t.Fatalf("stock=%v", stock)
	}
}

func TestOperationalImports(t *testing.T) {
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
	org, product, supplier, customer := uuid.New(), uuid.New(), uuid.New(), uuid.New()
	if _, err := db.Exec(ctx, `INSERT INTO organizations(id,name) VALUES($1,'Import test')`, org); err != nil {
		t.Fatal(err)
	}
	defer func() {
		for _, table := range []string{"payments", "inventory_transactions", "sales", "purchase_orders", "invoices", "products", "suppliers", "customers", "organizations"} {
			column := "organization_id"
			if table == "organizations" {
				column = "id"
			}
			db.Exec(ctx, "DELETE FROM "+table+" WHERE "+column+"=$1", org)
		}
	}()
	if _, err := db.Exec(ctx, `INSERT INTO suppliers(id,organization_id,name) VALUES($1,$2,'Supplier')`, supplier, org); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(ctx, `INSERT INTO products(id,organization_id,sku,name,current_stock,preferred_supplier_id) VALUES($1,$2,'SKU-1','Tile',80,$3)`, product, org, supplier); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(ctx, `INSERT INTO customers(id,organization_id,name) VALUES($1,$2,'Customer')`, customer, org); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(ctx, `INSERT INTO invoices(organization_id,customer_id,invoice_number,invoice_date,due_date,total,status) VALUES($1,$2,'INV-1',CURRENT_DATE-20,CURRENT_DATE-1,1000,'OVERDUE')`, org, customer); err != nil {
		t.Fatal(err)
	}
	svc := importer.Service{DB: db}
	files := []struct{ kind, body string }{
		{"inventory_transactions", "source_id,product_sku,transaction_type,quantity,timestamp\nrow-1,SKU-1,SALE,20,2026-09-24T12:00:00Z\n"},
		{"purchase_orders", fmt.Sprintf("supplier_id,po_number,order_date,expected_delivery_date,delivered_at,status\n%s,PO-1,2026-09-01,2026-09-08,2026-09-11,DELIVERED\n", supplier)},
		{"sales", fmt.Sprintf("source_id,customer_id,sale_date,total_amount\nsale-1,%s,2026-09-24,200\n", customer)},
		{"payments", "reference_number,invoice_number,payment_date,amount\nBANK-1,INV-1,2026-09-24,300\n"},
	}
	for _, file := range files {
		if _, err := svc.ImportCSV(ctx, org, file.kind, strings.NewReader(file.body), nil); err != nil {
			t.Fatalf("%s: %v", file.kind, err)
		}
	}
	if _, err := svc.ImportCSV(ctx, org, "payments", strings.NewReader(files[3].body), nil); err != nil {
		t.Fatalf("idempotent payment import: %v", err)
	}
	var outstanding float64
	if err := db.QueryRow(ctx, `SELECT outstanding_amount::float8 FROM invoices WHERE organization_id=$1 AND invoice_number='INV-1'`, org).Scan(&outstanding); err != nil {
		t.Fatal(err)
	}
	if outstanding != 700 {
		t.Fatalf("outstanding=%v", outstanding)
	}
}

func TestRecommendationAudit(t *testing.T) {
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
	org, user, product, signal := uuid.New(), uuid.New(), uuid.New(), uuid.New()
	if _, err := db.Exec(ctx, `INSERT INTO organizations(id,name) VALUES($1,'AI audit test')`, org); err != nil {
		t.Fatal(err)
	}
	defer func() {
		for _, table := range []string{"audit_logs", "actions", "ai_recommendations", "business_signals", "products", "users", "organizations"} {
			column := "organization_id"
			if table == "organizations" {
				column = "id"
			}
			db.Exec(ctx, "DELETE FROM "+table+" WHERE "+column+"=$1", org)
		}
	}()
	if _, err := db.Exec(ctx, `INSERT INTO users(id,organization_id,clerk_user_id,role) VALUES($1,$2,$3,'OWNER')`, user, org, "audit-test-"+user.String()); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(ctx, `INSERT INTO products(id,organization_id,sku,name) VALUES($1,$2,'AI-1','Tile')`, product, org); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(ctx, `INSERT INTO business_signals(id,organization_id,signal_type,entity_type,entity_id,severity,title,description) VALUES($1,$2,'STOCKOUT_RISK','PRODUCT',$3,'HIGH','Tile may stock out','4 days coverage')`, signal, org, product); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(ctx, `INSERT INTO actions(organization_id,action_type,payload,risk_level,requires_approval,status) VALUES($1,'CREATE_PURCHASE_ORDER',jsonb_build_object('product_id',$2::text,'quantity',240,'reason','Stock below lead time'),'HIGH',true,'AWAITING_APPROVAL')`, org, product.String()); err != nil {
		t.Fatal(err)
	}
	rec := ai.Recommendation{Priority: "HIGH", Category: "INVENTORY", Title: "Reorder tile", Reason: "Coverage below lead time", Evidence: []string{"Tile may stock out: 4 days coverage"}, RecommendedAction: "CREATE_PURCHASE_ORDER", RequiresApproval: true}
	id, err := (ai.Repository{DB: db}).Save(ctx, org, user, signal, "XiaomiMiMo/MiMo-V2.6-Pro-RL", "127.0.0.1", rec)
	if err != nil {
		t.Fatal(err)
	}
	var count int
	if err := db.QueryRow(ctx, `SELECT COUNT(*) FROM audit_logs WHERE organization_id=$1 AND resource_id=$2 AND action='AI_RECOMMENDATION_CREATED'`, org, id).Scan(&count); err != nil {
		t.Fatal(err)
	}
	if count != 1 {
		t.Fatalf("audit count=%d", count)
	}
	if err := db.QueryRow(ctx, `SELECT count(*) FROM actions WHERE organization_id=$1 AND recommendation_id=$2 AND payload->>'product_id'=$3`, org, id, product.String()).Scan(&count); err != nil {
		t.Fatal(err)
	}
	if count != 1 {
		t.Fatalf("linked actions=%d", count)
	}
}
