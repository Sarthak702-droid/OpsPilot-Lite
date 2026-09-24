package inventory

import (
	"context"
	"fmt"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Item struct {
	ID       uuid.UUID `json:"id"`
	SKU      string    `json:"sku"`
	Name     string    `json:"name"`
	Supplier string    `json:"supplier"`
	Metrics  Metrics   `json:"metrics"`
	Risk     string    `json:"risk"`
}
type Service struct{ DB *pgxpool.Pool }

func (s Service) List(ctx context.Context, org uuid.UUID) ([]Item, error) {
	rows, err := s.DB.Query(ctx, `SELECT p.id,p.sku,p.name,COALESCE(s.name,''),p.current_stock::float8,COALESCE(SUM(CASE WHEN t.transaction_type='SALE' AND t.timestamp>=now()-interval '7 days' THEN t.quantity ELSE 0 END),0)::float8,COALESCE(SUM(CASE WHEN t.transaction_type='SALE' AND t.timestamp>=now()-interval '30 days' THEN t.quantity ELSE 0 END),0)::float8,COALESCE(s.average_lead_time_days,7)::float8 FROM products p LEFT JOIN suppliers s ON s.id=p.preferred_supplier_id AND s.organization_id=p.organization_id LEFT JOIN inventory_transactions t ON t.product_id=p.id AND t.organization_id=p.organization_id AND t.timestamp>=now()-interval '30 days' WHERE p.organization_id=$1 GROUP BY p.id,s.name,s.average_lead_time_days ORDER BY p.name`, org)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]Item, 0)
	for rows.Next() {
		var x Item
		var stock, s7, s30, lead float64
		if err := rows.Scan(&x.ID, &x.SKU, &x.Name, &x.Supplier, &stock, &s7, &s30, &lead); err != nil {
			return nil, err
		}
		x.Metrics = Calculate(stock, s7, s30, lead, 3)
		x.Risk = StockSeverity(x.Metrics)
		items = append(items, x)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("inventory rows: %w", err)
	}
	return items, nil
}
