package purchaseorders

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/database"
)

func (s Service) Send(ctx context.Context, org, user, actionID uuid.UUID, mailer Mailer) error {
	if mailer == nil {
		return ErrMailUnavailable
	}
	if configured, ok := mailer.(interface{ Configured() bool }); ok && !configured.Configured() {
		return ErrMailUnavailable
	}
	var poID uuid.UUID
	var recipient string
	err := database.WithTx(ctx, s.DB, func(tx pgx.Tx) error {
		var requested, approved uuid.UUID
		var rawID string
		err := tx.QueryRow(ctx, `SELECT requested_by,approved_by,payload->>'purchase_order_id' FROM actions WHERE organization_id=$1 AND id=$2 AND action_type='SEND_PURCHASE_ORDER' AND status='APPROVED' FOR UPDATE`, org, actionID).Scan(&requested, &approved, &rawID)
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrConflict
		}
		if err != nil {
			return err
		}
		if requested == approved {
			return ErrConflict
		}
		poID, err = uuid.Parse(rawID)
		if err != nil {
			return ErrInvalid
		}
		var status, state string
		err = tx.QueryRow(ctx, `SELECT p.status,p.send_state,s.email FROM purchase_orders p JOIN suppliers s ON s.organization_id=p.organization_id AND s.id=p.supplier_id WHERE p.organization_id=$1 AND p.id=$2 FOR UPDATE OF p`, org, poID).Scan(&status, &state, &recipient)
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		if err != nil {
			return err
		}
		if status != "DRAFT" || state != "NOT_SENT" || recipient == "" {
			return ErrConflict
		}
		if _, err = tx.Exec(ctx, `UPDATE purchase_orders SET send_state='SENDING',updated_at=now() WHERE organization_id=$1 AND id=$2`, org, poID); err != nil {
			return err
		}
		_, err = tx.Exec(ctx, `INSERT INTO audit_logs(organization_id,user_id,action,resource_type,resource_id,metadata) VALUES($1,$2,'PURCHASE_ORDER_SEND_ATTEMPT','PURCHASE_ORDER',$3,jsonb_build_object('action_id',$4::text))`, org, user, poID, actionID.String())
		return err
	})
	if err != nil {
		return err
	}
	order, err := s.Get(ctx, org, poID)
	var sendErr error
	if err != nil {
		sendErr = err
	}
	var body strings.Builder
	if sendErr == nil {
		fmt.Fprintf(&body, "Purchase order %s\nOrder date: %s\nExpected delivery: %s\n\n", order.Number, order.OrderDate, value(order.ExpectedDate))
		for _, line := range order.Items {
			fmt.Fprintf(&body, "%s — quantity %s at %s each\n", line.Product, line.Quantity, line.UnitCost)
		}
		fmt.Fprintf(&body, "\nTotal: %s\n", order.Total)
		sendErr = mailer.Send(ctx, recipient, "Purchase order "+order.Number, body.String())
	}
	finalErr := database.WithTx(ctx, s.DB, func(tx pgx.Tx) error {
		if sendErr == nil {
			if _, err := tx.Exec(ctx, `UPDATE purchase_orders SET status='PENDING',send_state='SENT',sent_at=now(),updated_at=now() WHERE organization_id=$1 AND id=$2 AND send_state='SENDING'`, org, poID); err != nil {
				return err
			}
			if _, err := tx.Exec(ctx, `UPDATE actions SET status='EXECUTED',executed_at=now() WHERE organization_id=$1 AND id=$2`, org, actionID); err != nil {
				return err
			}
			_, err := tx.Exec(ctx, `INSERT INTO audit_logs(organization_id,user_id,action,resource_type,resource_id) VALUES($1,$2,'PURCHASE_ORDER_SENT','PURCHASE_ORDER',$3)`, org, user, poID)
			return err
		}
		if _, err := tx.Exec(ctx, `UPDATE purchase_orders SET send_state='UNCERTAIN',updated_at=now() WHERE organization_id=$1 AND id=$2`, org, poID); err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `UPDATE actions SET status='FAILED' WHERE organization_id=$1 AND id=$2`, org, actionID); err != nil {
			return err
		}
		_, err := tx.Exec(ctx, `INSERT INTO audit_logs(organization_id,user_id,action,resource_type,resource_id,metadata) VALUES($1,$2,'PURCHASE_ORDER_SEND_UNCERTAIN','PURCHASE_ORDER',$3,jsonb_build_object('action_id',$4::text))`, org, user, poID, actionID.String())
		return err
	})
	if finalErr != nil {
		return finalErr
	}
	if sendErr != nil {
		return sendErr
	}
	return nil
}
func value(s *string) string {
	if s == nil {
		return "Not specified"
	}
	return *s
}
