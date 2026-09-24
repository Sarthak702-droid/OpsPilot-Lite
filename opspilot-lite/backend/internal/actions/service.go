package actions

import (
	"context"
	"encoding/json"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PurchaseOrderDraft struct {
	ProductID  uuid.UUID `json:"product_id"`
	SupplierID uuid.UUID `json:"supplier_id"`
	Quantity   float64   `json:"quantity"`
	Reason     string    `json:"reason"`
}
type Service struct{ DB *pgxpool.Pool }

func (s Service) EnsurePurchaseOrder(ctx context.Context, org uuid.UUID, draft PurchaseOrderDraft) error {
	payload, err := json.Marshal(draft)
	if err != nil {
		return err
	}
	_, err = s.DB.Exec(ctx, `INSERT INTO actions(organization_id,action_type,payload,risk_level,requires_approval,status) SELECT $1,'CREATE_PURCHASE_ORDER',$2::jsonb,'HIGH',true,'AWAITING_APPROVAL' WHERE NOT EXISTS (SELECT 1 FROM actions WHERE organization_id=$1 AND action_type='CREATE_PURCHASE_ORDER' AND payload->>'product_id'=$3 AND status <> 'FAILED')`, org, string(payload), draft.ProductID.String())
	return err
}
