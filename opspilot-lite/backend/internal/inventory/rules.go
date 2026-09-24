package inventory

func StockSeverity(m Metrics) string {
	if m.AverageDailySales7D <= 0 && m.AverageDailySales30D <= 0 {
		return "INFO"
	}
	if m.Stock <= 0 {
		return "CRITICAL"
	}
	if m.StockDaysRemaining <= m.SupplierLeadTime {
		return "HIGH"
	}
	if m.StockDaysRemaining <= m.SupplierLeadTime+3 {
		return "MEDIUM"
	}
	return "LOW"
}
