package inventory

import "math"

type Metrics struct{ Stock, Sales7D, Sales30D, AverageDailySales7D, AverageDailySales30D, StockDaysRemaining, SupplierLeadTime, ReorderPoint, SafetyStock, RecommendedOrderQuantity float64 }

func Calculate(stock, sales7d, sales30d, leadDays, safetyDays float64) Metrics {
	if leadDays <= 0 {
		leadDays = 7
	}
	if safetyDays < 0 {
		safetyDays = 0
	}
	d7, d30 := sales7d/7, sales30d/30
	demand := d30
	if d7 > 0 {
		demand = d7
	}
	if demand < 0 {
		demand = 0
	}
	safety := demand * safetyDays
	reorder := demand*leadDays + safety
	days := 0.0
	if demand > 0 {
		days = stock / demand
	}
	qty := math.Max(0, math.Ceil(reorder-stock))
	return Metrics{stock, sales7d, sales30d, d7, d30, days, leadDays, reorder, safety, qty}
}
