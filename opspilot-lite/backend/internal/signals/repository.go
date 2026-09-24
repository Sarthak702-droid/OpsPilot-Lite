package signals

import (
	"context"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct{ DB *pgxpool.Pool }

func (r Repository) List(ctx context.Context, org uuid.UUID) ([]Signal, error) {
	rows, err := r.DB.Query(ctx, `SELECT id,signal_type,entity_type,entity_id,severity,title,description,metric_name,metric_value::float8,status,created_at FROM business_signals WHERE organization_id=$1 AND status='ACTIVE' ORDER BY CASE severity WHEN 'CRITICAL' THEN 0 WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END,created_at DESC LIMIT 100`, org)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]Signal, 0)
	for rows.Next() {
		var x Signal
		if err := rows.Scan(&x.ID, &x.Type, &x.EntityType, &x.EntityID, &x.Severity, &x.Title, &x.Description, &x.MetricName, &x.MetricValue, &x.Status, &x.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, x)
	}
	return out, rows.Err()
}
func (r Repository) Upsert(ctx context.Context, org uuid.UUID, s Signal) error {
	_, err := r.DB.Exec(ctx, `INSERT INTO business_signals(organization_id,signal_type,entity_type,entity_id,severity,title,description,metric_name,metric_value,status,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'ACTIVE',now()+interval '30 minutes') ON CONFLICT(organization_id,signal_type,entity_type,entity_id) DO UPDATE SET severity=EXCLUDED.severity,title=EXCLUDED.title,description=EXCLUDED.description,metric_name=EXCLUDED.metric_name,metric_value=EXCLUDED.metric_value,status='ACTIVE',expires_at=EXCLUDED.expires_at`, org, s.Type, s.EntityType, s.EntityID, s.Severity, s.Title, s.Description, s.MetricName, s.MetricValue)
	return err
}
func (r Repository) Resolve(ctx context.Context, org uuid.UUID, signalType, entityType string, entityID uuid.UUID) error {
	_, err := r.DB.Exec(ctx, `UPDATE business_signals SET status='RESOLVED',expires_at=now() WHERE organization_id=$1 AND signal_type=$2 AND entity_type=$3 AND entity_id=$4 AND status='ACTIVE'`, org, signalType, entityType, entityID)
	return err
}
