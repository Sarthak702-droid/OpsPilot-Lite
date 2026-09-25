package purchaseorders

import (
	"context"
	"errors"
	"time"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/database"
)

func (s Service) ResolveSend(ctx context.Context, org, user, poID uuid.UUID, outcome string) error {
	if outcome != "SENT" && outcome != "NOT_SENT" {
		return ErrInvalid
	}
	return database.WithTx(ctx, s.DB, func(tx pgx.Tx) error {
		var state string
		var updated time.Time
		if err := tx.QueryRow(ctx, `SELECT send_state,updated_at FROM purchase_orders WHERE organization_id=$1 AND id=$2 FOR UPDATE`, org, poID).Scan(&state,&updated); errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		} else if err != nil {
			return err
		}
		if state != "UNCERTAIN" && state != "SENDING" {
			return ErrConflict
		}
		if state == "SENDING" && time.Since(updated)<time.Minute { return ErrConflict }
		if outcome == "SENT" {
			if _, err := tx.Exec(ctx, `UPDATE purchase_orders SET send_state='SENT',status='PENDING',sent_at=now(),updated_at=now() WHERE organization_id=$1 AND id=$2`, org, poID); err != nil {
				return err
			}
			if _, err := tx.Exec(ctx, `UPDATE actions SET status='EXECUTED',executed_at=now() WHERE organization_id=$1 AND action_type='SEND_PURCHASE_ORDER' AND payload->>'purchase_order_id'=$2 AND status IN ('FAILED','APPROVED')`, org, poID.String()); err != nil {
				return err
			}
		} else {
			if _, err := tx.Exec(ctx, `UPDATE purchase_orders SET send_state='NOT_SENT',status='DRAFT',updated_at=now() WHERE organization_id=$1 AND id=$2`, org, poID); err != nil {
				return err
			}
			if _, err := tx.Exec(ctx, `UPDATE actions SET status='FAILED' WHERE organization_id=$1 AND action_type='SEND_PURCHASE_ORDER' AND payload->>'purchase_order_id'=$2 AND status='APPROVED'`, org, poID.String()); err != nil {
				return err
			}
		}
		_, err := tx.Exec(ctx, `INSERT INTO audit_logs(organization_id,user_id,action,resource_type,resource_id,metadata) VALUES($1,$2,'PURCHASE_ORDER_SEND_RESOLVED','PURCHASE_ORDER',$3,jsonb_build_object('outcome',$4::text))`, org, user, poID, outcome)
		return err
	})
}
func (s Service) CancelDraft(ctx context.Context, org, user, poID uuid.UUID) error {
	return database.WithTx(ctx, s.DB, func(tx pgx.Tx) error {
		var status, state string
		if err := tx.QueryRow(ctx, `SELECT status,send_state FROM purchase_orders WHERE organization_id=$1 AND id=$2 FOR UPDATE`, org, poID).Scan(&status, &state); errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		} else if err != nil {
			return err
		}
		if status != "DRAFT" || state != "NOT_SENT" {
			return ErrConflict
		}
		var pending bool
		if err := tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM actions WHERE organization_id=$1 AND action_type='SEND_PURCHASE_ORDER' AND payload->>'purchase_order_id'=$2 AND status IN ('AWAITING_APPROVAL','APPROVED'))`, org, poID.String()).Scan(&pending); err != nil {
			return err
		}
		if pending {
			return ErrConflict
		}
		if _, err := tx.Exec(ctx, `UPDATE purchase_orders SET status='CANCELLED',updated_at=now() WHERE organization_id=$1 AND id=$2`, org, poID); err != nil {
			return err
		}
		_, err := tx.Exec(ctx, `INSERT INTO audit_logs(organization_id,user_id,action,resource_type,resource_id) VALUES($1,$2,'PURCHASE_ORDER_CANCELLED','PURCHASE_ORDER',$3)`, org, user, poID)
		return err
	})
}
