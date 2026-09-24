package ai

import (
	"context"
	"encoding/json"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/database"
)

type SavedRecommendation struct {
	ID             uuid.UUID      `json:"id"`
	SignalID       uuid.UUID      `json:"signal_id"`
	Model          string         `json:"model"`
	Recommendation Recommendation `json:"recommendation"`
	CreatedAt      string         `json:"created_at"`
}
type Repository struct{ DB *pgxpool.Pool }

func (r Repository) Save(ctx context.Context, org, user, signal uuid.UUID, model, ip string, recommendation Recommendation) (uuid.UUID, error) {
	payload, err := json.Marshal(recommendation)
	if err != nil {
		return uuid.Nil, err
	}
	var id uuid.UUID
	err = database.WithTx(ctx, r.DB, func(tx pgx.Tx) error {
		if err := tx.QueryRow(ctx, `INSERT INTO ai_recommendations(organization_id,signal_id,model_used,recommendation_type,reason,structured_payload) VALUES($1,$2,$3,$4,$5,$6) RETURNING id`, org, signal, model, recommendation.RecommendedAction, recommendation.Reason, payload).Scan(&id); err != nil {
			return err
		}
		_, err := tx.Exec(ctx, `INSERT INTO audit_logs(organization_id,user_id,action,resource_type,resource_id,metadata,ip_address) VALUES($1,$2,'AI_RECOMMENDATION_CREATED','AI_RECOMMENDATION',$3,jsonb_build_object('model',$4::text,'signal_id',$5::uuid),$6::inet)`, org, user, id, model, signal, ip)
		if err != nil {
			return err
		}
		if recommendation.RecommendedAction == "CREATE_PURCHASE_ORDER" {
			_, err = tx.Exec(ctx, `UPDATE actions AS a SET recommendation_id=$1
				FROM business_signals AS s
				WHERE a.organization_id=$2 AND a.action_type='CREATE_PURCHASE_ORDER'
				AND a.status='AWAITING_APPROVAL' AND a.payload->>'product_id'=s.entity_id::text
				AND s.organization_id=$2 AND s.id=$3 AND s.signal_type='STOCKOUT_RISK'`, id, org, signal)
		}
		return err
	})
	return id, err
}
func (r Repository) List(ctx context.Context, org uuid.UUID) ([]SavedRecommendation, error) {
	rows, err := r.DB.Query(ctx, `SELECT id,signal_id,model_used,structured_payload,created_at::text FROM ai_recommendations WHERE organization_id=$1 ORDER BY created_at DESC LIMIT 20`, org)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]SavedRecommendation, 0)
	for rows.Next() {
		var x SavedRecommendation
		var raw []byte
		if err := rows.Scan(&x.ID, &x.SignalID, &x.Model, &raw, &x.CreatedAt); err != nil {
			return nil, err
		}
		if err := json.Unmarshal(raw, &x.Recommendation); err != nil {
			return nil, err
		}
		out = append(out, x)
	}
	return out, rows.Err()
}
