package inventory

import "testing"

func TestStockoutCalculation(t *testing.T) {
	m := Calculate(80, 140, 600, 6, 3)
	if m.StockDaysRemaining != 4 {
		t.Fatalf("coverage=%v", m.StockDaysRemaining)
	}
	if m.ReorderPoint != 180 {
		t.Fatalf("reorder=%v", m.ReorderPoint)
	}
	if m.RecommendedOrderQuantity != 100 {
		t.Fatalf("quantity=%v", m.RecommendedOrderQuantity)
	}
	if StockSeverity(m) != "HIGH" {
		t.Fatalf("severity=%s", StockSeverity(m))
	}
}
func TestNoDemandDoesNotInventCoverage(t *testing.T) {
	m := Calculate(20, 0, 0, 7, 3)
	if m.RecommendedOrderQuantity != 0 || StockSeverity(m) != "INFO" {
		t.Fatalf("unexpected no-demand result: %+v", m)
	}
}
