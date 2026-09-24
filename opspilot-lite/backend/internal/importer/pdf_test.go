package importer

import (
	"context"
	"os"
	"strings"
	"testing"

	"github.com/google/uuid"
)

func TestPDFTextAndReview(t *testing.T) {
	data, err := os.ReadFile("../../../testdata/pdf/sample-invoice.pdf")
	if err != nil {
		t.Fatal(err)
	}
	content, err := pdfText(context.Background(), data)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(content, "INV-2026-001") {
		t.Fatalf("invoice number not extracted: %q", content)
	}
	if _, err := pdfText(context.Background(), []byte("not a PDF")); err == nil {
		t.Fatal("accepted invalid PDF")
	}
	valid := DocumentReview{ExtractedFields: ExtractedFields{DocumentType: "INVOICE", DocumentNumber: "INV-2026-001", DocumentDate: "2026-09-01", DueDate: "2026-09-30", TotalAmount: "120000.00"}, CounterpartyID: uuid.New()}
	if err := valid.Validate(); err != nil {
		t.Fatal(err)
	}
	valid.CounterpartyID = uuid.Nil
	if err := valid.Validate(); err == nil {
		t.Fatal("accepted invoice without customer")
	}
}
