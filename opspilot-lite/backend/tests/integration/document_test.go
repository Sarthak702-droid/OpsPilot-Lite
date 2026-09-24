package integration

import (
	"context"
	"os"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/importer"
)

type memoryStore struct{ put, deleted int }

func (m *memoryStore) Put(_ context.Context, _, _ string, _ []byte) error { m.put++; return nil }
func (m *memoryStore) Delete(_ context.Context, _ string) error           { m.deleted++; return nil }

func TestReviewedPDFCommitAndTenantIsolation(t *testing.T) {
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
	org, otherOrg, user, customer, otherCustomer := uuid.New(), uuid.New(), uuid.New(), uuid.New(), uuid.New()
	for _, id := range []uuid.UUID{org, otherOrg} {
		if _, err := db.Exec(ctx, `INSERT INTO organizations(id,name) VALUES($1,'PDF test')`, id); err != nil {
			t.Fatal(err)
		}
	}
	defer func() {
		for _, table := range []string{"audit_logs", "document_imports", "invoices", "customers", "users"} {
			_, _ = db.Exec(ctx, "DELETE FROM "+table+" WHERE organization_id IN ($1,$2)", org, otherOrg)
		}
		_, _ = db.Exec(ctx, `DELETE FROM organizations WHERE id IN ($1,$2)`, org, otherOrg)
	}()
	if _, err := db.Exec(ctx, `INSERT INTO users(id,organization_id,clerk_user_id,role) VALUES($1,$2,$3,'OWNER')`, user, org, "pdf-test-"+user.String()); err != nil {
		t.Fatal(err)
	}
	for _, row := range []struct{ id, tenant uuid.UUID }{{customer, org}, {otherCustomer, otherOrg}} {
		if _, err := db.Exec(ctx, `INSERT INTO customers(id,organization_id,name) VALUES($1,$2,'PDF customer')`, row.id, row.tenant); err != nil {
			t.Fatal(err)
		}
	}
	data, err := os.ReadFile("../../../testdata/pdf/sample-invoice.pdf")
	if err != nil {
		t.Fatal(err)
	}
	store := &memoryStore{}
	svc := importer.DocumentService{DB: db, Store: store}
	review := importer.DocumentReview{ExtractedFields: importer.ExtractedFields{DocumentType: "INVOICE", DocumentNumber: "PDF-OK-" + uuid.NewString(), DocumentDate: "2026-09-01", DueDate: "2026-09-30", TotalAmount: "120000.00"}, CounterpartyID: customer}
	id, err := svc.Commit(ctx, org, user, "127.0.0.1", "invoice.pdf", data, review)
	if err != nil {
		t.Fatal(err)
	}
	var count int
	if err := db.QueryRow(ctx, `SELECT count(*) FROM document_imports WHERE organization_id=$1 AND id=$2`, org, id).Scan(&count); err != nil {
		t.Fatal(err)
	}
	if count != 1 || store.put != 1 {
		t.Fatalf("document count %d, uploads %d", count, store.put)
	}
	if err := db.QueryRow(ctx, `SELECT count(*) FROM audit_logs WHERE organization_id=$1 AND resource_id=$2 AND action='DOCUMENT_IMPORT_REVIEWED'`, org, id).Scan(&count); err != nil {
		t.Fatal(err)
	}
	if count != 1 {
		t.Fatalf("audit count %d", count)
	}
	review.CounterpartyID = otherCustomer
	review.DocumentNumber = "PDF-CROSS-" + uuid.NewString()
	if _, err := svc.Commit(ctx, org, user, "127.0.0.1", "invoice.pdf", data, review); err == nil {
		t.Fatal("cross-tenant customer accepted")
	}
	if store.put != 2 || store.deleted != 1 {
		t.Fatalf("failed transaction did not clean object: uploads=%d deletes=%d", store.put, store.deleted)
	}
	quote := importer.DocumentReview{ExtractedFields: importer.ExtractedFields{DocumentType: "QUOTATION", DocumentNumber: "PDF-QUOTE-" + uuid.NewString(), DocumentDate: "2026-09-01", TotalAmount: "900.00"}}
	if _, err := svc.Commit(ctx, org, user, "127.0.0.1", "quote.pdf", data, quote); err != nil {
		t.Fatalf("quotation without counterparty: %v", err)
	}
}
