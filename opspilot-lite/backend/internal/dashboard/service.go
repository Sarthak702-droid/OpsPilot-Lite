package dashboard

import (
	"context"
	"encoding/json"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/cache"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/signals"
	"github.com/redis/go-redis/v9"
	"time"
)

type Summary struct {
	Revenue30D     float64          `json:"revenue_30d"`
	Outstanding    float64          `json:"outstanding"`
	Overdue        float64          `json:"overdue"`
	LowStock       int              `json:"low_stock"`
	CriticalAlerts int              `json:"critical_alerts"`
	PendingActions int              `json:"pending_actions"`
	Priorities     []signals.Signal `json:"priorities"`
	AIAvailable    bool             `json:"ai_available"`
}
type Service struct {
	DB      *pgxpool.Pool
	Redis   *redis.Client
	Signals signals.Repository
}

func (s Service) Get(ctx context.Context, org uuid.UUID) (Summary, error) {
	if s.Redis != nil {
		raw, err := s.Redis.Get(ctx, cache.DashboardKey(org)).Bytes()
		if err == nil {
			var cached Summary
			if json.Unmarshal(raw, &cached) == nil {
				return cached, nil
			}
		}
	}
	var x Summary
	err := s.DB.QueryRow(ctx, `SELECT COALESCE((SELECT SUM(total_amount) FROM sales WHERE organization_id=$1 AND status='COMPLETED' AND sale_date>=CURRENT_DATE-30),0)::float8,COALESCE((SELECT SUM(outstanding_amount) FROM invoices WHERE organization_id=$1 AND status NOT IN ('DRAFT','CANCELLED')),0)::float8,COALESCE((SELECT SUM(outstanding_amount) FROM invoices WHERE organization_id=$1 AND due_date<CURRENT_DATE AND status NOT IN ('DRAFT','CANCELLED')),0)::float8,(SELECT COUNT(*) FROM products WHERE organization_id=$1 AND current_stock<=reorder_level)::int,(SELECT COUNT(*) FROM business_signals WHERE organization_id=$1 AND status='ACTIVE' AND severity='CRITICAL')::int,(SELECT COUNT(*) FROM actions WHERE organization_id=$1 AND status='AWAITING_APPROVAL')::int`, org).Scan(&x.Revenue30D, &x.Outstanding, &x.Overdue, &x.LowStock, &x.CriticalAlerts, &x.PendingActions)
	if err != nil {
		return x, err
	}
	x.Priorities, err = s.Signals.List(ctx, org)
	if err != nil {
		return x, err
	}
	if len(x.Priorities) > 5 {
		x.Priorities = x.Priorities[:5]
	}
	if s.Redis != nil {
		if raw, err := json.Marshal(x); err == nil {
			s.Redis.Set(ctx, cache.DashboardKey(org), raw, 45*time.Second)
		}
	}
	return x, nil
}
