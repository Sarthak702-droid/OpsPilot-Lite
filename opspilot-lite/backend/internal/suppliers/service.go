package suppliers

import (
	"context"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Item struct {
	ID                  uuid.UUID `json:"id"`
	Name                string    `json:"name"`
	Email               string    `json:"email"`
	LeadTime            float64   `json:"lead_time_days"`
	Orders              int       `json:"orders"`
	Delivered           int       `json:"delivered"`
	Late                int       `json:"late"`
	OnTimeRate          float64   `json:"on_time_rate"`
	AverageDeliveryDays *float64  `json:"average_delivery_days"`
	AverageDelayDays    *float64  `json:"average_delay_days"`
	CompletionRate      float64   `json:"order_completion_rate"`
	PriceVariance       *float64  `json:"price_variance"`
	Risk                string    `json:"risk"`
}
type Service struct{ DB *pgxpool.Pool }

func (s Service) List(ctx context.Context, org uuid.UUID) ([]Item, error) {
	rows, err := s.DB.Query(ctx, `SELECT s.id,s.name,s.email,s.average_lead_time_days::float8,
		COALESCE(o.orders,0)::int,COALESCE(o.delivered,0)::int,COALESCE(o.late,0)::int,
		o.average_delivery_days::float8,o.average_delay_days::float8,COALESCE(o.active_orders,0)::int,p.price_variance::float8
		FROM suppliers s LEFT JOIN LATERAL (
		 SELECT COUNT(*) orders,COUNT(*) FILTER(WHERE status<>'CANCELLED') active_orders,
		 COUNT(*) FILTER(WHERE status='DELIVERED') delivered,
		 COUNT(*) FILTER(WHERE delivered_at>expected_delivery_date) late,
		 AVG(delivered_at-order_date) FILTER(WHERE status='DELIVERED' AND delivered_at IS NOT NULL) average_delivery_days,
		 AVG(GREATEST(delivered_at-expected_delivery_date,0)) FILTER(WHERE status='DELIVERED' AND delivered_at IS NOT NULL AND expected_delivery_date IS NOT NULL) average_delay_days
		 FROM purchase_orders WHERE organization_id=s.organization_id AND supplier_id=s.id
		) o ON true LEFT JOIN LATERAL (
		 SELECT AVG((i.unit_cost-p.cost_price)/NULLIF(p.cost_price,0)*100) price_variance
		 FROM purchase_orders po JOIN purchase_order_items i ON i.organization_id=po.organization_id AND i.purchase_order_id=po.id
		 JOIN products p ON p.organization_id=i.organization_id AND p.id=i.product_id
			 WHERE po.organization_id=s.organization_id AND po.supplier_id=s.id AND po.status IN ('PENDING','PARTIAL','DELIVERED') AND p.cost_price>0
		) p ON true WHERE s.organization_id=$1 ORDER BY s.name`, org)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]Item, 0)
	for rows.Next() {
		var x Item
		var active int
		if err := rows.Scan(&x.ID, &x.Name, &x.Email, &x.LeadTime, &x.Orders, &x.Delivered, &x.Late, &x.AverageDeliveryDays, &x.AverageDelayDays, &active, &x.PriceVariance); err != nil {
			return nil, err
		}
		if x.Delivered > 0 {
			x.OnTimeRate = 100 * float64(x.Delivered-x.Late) / float64(x.Delivered)
		}
		if active > 0 {
			x.CompletionRate = 100 * float64(x.Delivered) / float64(active)
		}
		x.Risk = Reliability(x.Delivered, x.Late)
		items = append(items, x)
	}
	return items, rows.Err()
}
