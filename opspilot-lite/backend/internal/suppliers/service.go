package suppliers

import (
	"context"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Item struct {
	ID         uuid.UUID `json:"id"`
	Name       string    `json:"name"`
	Email      string    `json:"email"`
	LeadTime   float64   `json:"lead_time_days"`
	Orders     int       `json:"orders"`
	Delivered  int       `json:"delivered"`
	Late       int       `json:"late"`
	OnTimeRate float64   `json:"on_time_rate"`
	Risk       string    `json:"risk"`
}
type Service struct{ DB *pgxpool.Pool }

func (s Service) List(ctx context.Context, org uuid.UUID) ([]Item, error) {
	rows, err := s.DB.Query(ctx, `SELECT s.id,s.name,s.email,s.average_lead_time_days::float8,COUNT(po.id)::int,COUNT(po.id) FILTER(WHERE po.delivered_at IS NOT NULL)::int,COUNT(po.id) FILTER(WHERE po.delivered_at>po.expected_delivery_date)::int FROM suppliers s LEFT JOIN purchase_orders po ON po.supplier_id=s.id AND po.organization_id=s.organization_id WHERE s.organization_id=$1 GROUP BY s.id ORDER BY s.name`, org)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]Item, 0)
	for rows.Next() {
		var x Item
		if err := rows.Scan(&x.ID, &x.Name, &x.Email, &x.LeadTime, &x.Orders, &x.Delivered, &x.Late); err != nil {
			return nil, err
		}
		if x.Delivered > 0 {
			x.OnTimeRate = 100 * float64(x.Delivered-x.Late) / float64(x.Delivered)
		}
		x.Risk = Reliability(x.Delivered, x.Late)
		items = append(items, x)
	}
	return items, rows.Err()
}
