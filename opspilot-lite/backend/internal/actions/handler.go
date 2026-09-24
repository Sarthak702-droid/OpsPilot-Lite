package actions

import (
	"encoding/json"
	"errors"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/auth"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/common"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/database"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/inventory"
	"log"
	"math"
	"net/http"
)

type Item struct {
	ID               uuid.UUID       `json:"id"`
	RecommendationID *uuid.UUID      `json:"recommendation_id,omitempty"`
	ActionType       string          `json:"action_type"`
	Payload          json.RawMessage `json:"payload"`
	ProductName      string          `json:"product_name,omitempty"`
	SupplierName     string          `json:"supplier_name,omitempty"`
	Reason           string          `json:"reason"`
	Evidence         []string        `json:"evidence"`
	RiskLevel        string          `json:"risk_level"`
	Status           string          `json:"status"`
	CreatedAt        string          `json:"created_at"`
}
type Handler struct{ DB *pgxpool.Pool }

func (h Handler) List(c *gin.Context) {
	id, _ := auth.Current(c)
	rows, err := h.DB.Query(c.Request.Context(), `SELECT a.id,a.recommendation_id,a.action_type,a.payload,
		COALESCE(p.name,''),COALESCE(s.name,''),COALESCE(r.reason,a.payload->>'reason',''),
		COALESCE(r.structured_payload->'evidence','[]'::jsonb),a.risk_level,a.status,a.created_at::text
		FROM actions a
		LEFT JOIN ai_recommendations r ON r.organization_id=a.organization_id AND r.id=a.recommendation_id
		LEFT JOIN products p ON p.organization_id=a.organization_id AND p.id::text=a.payload->>'product_id'
		LEFT JOIN suppliers s ON s.organization_id=a.organization_id AND s.id::text=a.payload->>'supplier_id'
		WHERE a.organization_id=$1 ORDER BY a.created_at DESC LIMIT 100`, id.OrganizationID)
	if err != nil {
		common.Error(c, 500, "DATABASE_ERROR", "Could not load actions")
		return
	}
	defer rows.Close()
	items := make([]Item, 0)
	for rows.Next() {
		var x Item
		var evidenceJSON []byte
		if err := rows.Scan(&x.ID, &x.RecommendationID, &x.ActionType, &x.Payload, &x.ProductName, &x.SupplierName, &x.Reason, &evidenceJSON, &x.RiskLevel, &x.Status, &x.CreatedAt); err != nil {
			common.Error(c, 500, "DATABASE_ERROR", "Could not read actions")
			return
		}
		if err := json.Unmarshal(evidenceJSON, &x.Evidence); err != nil {
			common.Error(c, 500, "DATABASE_ERROR", "Could not read action evidence")
			return
		}
		items = append(items, x)
	}
	c.JSON(200, gin.H{"items": items})
}
func (h Handler) Decide(approve bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, _ := auth.Current(c)
		actionID, err := uuid.Parse(c.Param("id"))
		if err != nil {
			common.Error(c, 400, "BAD_REQUEST", "Invalid action ID")
			return
		}
		next := "REJECTED"
		auditAction := "ACTION_REJECTED"
		if approve {
			next = "APPROVED"
			auditAction = "ACTION_APPROVED"
		}
		var changed bool
		err = database.WithTx(c.Request.Context(), h.DB, func(tx pgx.Tx) error {
			tag, err := tx.Exec(c.Request.Context(), `UPDATE actions SET status=$1,approved_by=CASE WHEN $1='APPROVED' THEN $2::uuid ELSE NULL END WHERE id=$3 AND organization_id=$4 AND status IN ('SUGGESTED','AWAITING_APPROVAL')`, next, id.UserID, actionID, id.OrganizationID)
			if err != nil {
				return err
			}
			changed = tag.RowsAffected() == 1
			if !changed {
				return nil
			}
			_, err = tx.Exec(c.Request.Context(), `INSERT INTO audit_logs(organization_id,user_id,action,resource_type,resource_id,metadata,ip_address) VALUES($1,$2,$3,'ACTION',$4,jsonb_build_object('status',$5::text),$6::inet)`, id.OrganizationID, id.UserID, auditAction, actionID, next, c.ClientIP())
			return err
		})
		if err != nil {
			log.Printf("approve action %s: %v", actionID, err)
			common.Error(c, 500, "DATABASE_ERROR", "Could not update action")
			return
		}
		if !changed {
			common.Error(c, http.StatusConflict, "ACTION_CONFLICT", "Action already decided or unavailable")
			return
		}
		c.JSON(200, gin.H{"id": actionID, "status": next})
	}
}
func (h Handler) Execute(c *gin.Context) {
	id, _ := auth.Current(c)
	actionID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		common.Error(c, 400, "BAD_REQUEST", "Invalid action ID")
		return
	}
	var found, stale bool
	err = database.WithTx(c.Request.Context(), h.DB, func(tx pgx.Tx) error {
		var kind string
		var raw []byte
		err := tx.QueryRow(c.Request.Context(), `SELECT action_type,payload FROM actions WHERE organization_id=$1 AND id=$2 AND status='APPROVED' AND approved_by IS NOT NULL FOR UPDATE`, id.OrganizationID, actionID).Scan(&kind, &raw)
		if err == pgx.ErrNoRows {
			return nil
		}
		if err != nil {
			return err
		}
		found = true
		failStale := func() error {
			if _, err := tx.Exec(c.Request.Context(), `UPDATE actions SET status='FAILED' WHERE organization_id=$1 AND id=$2 AND status='APPROVED'`, id.OrganizationID, actionID); err != nil {
				return err
			}
			if _, err := tx.Exec(c.Request.Context(), `INSERT INTO audit_logs(organization_id,user_id,action,resource_type,resource_id,metadata,ip_address) VALUES($1,$2,'ACTION_FAILED','ACTION',$3,'{"reason":"stale_inventory"}'::jsonb,$4::inet)`, id.OrganizationID, id.UserID, actionID, c.ClientIP()); err != nil {
				return err
			}
			stale = true
			return nil
		}
		if kind != "CREATE_PURCHASE_ORDER" {
			return errors.New("unsupported action type")
		}
		var draft PurchaseOrderDraft
		if err := json.Unmarshal(raw, &draft); err != nil {
			return err
		}
		if draft.SupplierID == uuid.Nil || draft.ProductID == uuid.Nil || draft.Quantity <= 0 {
			return errors.New("invalid purchase order payload")
		}
		var supplierExists bool
		if err := tx.QueryRow(c.Request.Context(), `SELECT EXISTS(SELECT 1 FROM suppliers WHERE organization_id=$1 AND id=$2)`, id.OrganizationID, draft.SupplierID).Scan(&supplierExists); err != nil {
			return err
		}
		if !supplierExists {
			return errors.New("supplier unavailable")
		}
		var stock, lead float64
		if err := tx.QueryRow(c.Request.Context(), `SELECT p.current_stock::float8,s.average_lead_time_days::float8 FROM products p JOIN suppliers s ON s.organization_id=p.organization_id AND s.id=p.preferred_supplier_id WHERE p.organization_id=$1 AND p.id=$2 AND s.id=$3 FOR UPDATE OF p`, id.OrganizationID, draft.ProductID, draft.SupplierID).Scan(&stock, &lead); err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return failStale()
			}
			return err
		}
		var sold7, sold30 float64
		if err := tx.QueryRow(c.Request.Context(), `SELECT COALESCE(SUM(quantity) FILTER (WHERE transaction_type='SALE' AND timestamp>=now()-interval '7 days'),0)::float8,COALESCE(SUM(quantity) FILTER (WHERE transaction_type='SALE' AND timestamp>=now()-interval '30 days'),0)::float8 FROM inventory_transactions WHERE organization_id=$1 AND product_id=$2`, id.OrganizationID, draft.ProductID).Scan(&sold7, &sold30); err != nil {
			return err
		}
		metrics := inventory.Calculate(stock, sold7, sold30, lead, 3)
		if (inventory.StockSeverity(metrics) != "HIGH" && inventory.StockSeverity(metrics) != "CRITICAL") || math.Abs(metrics.RecommendedOrderQuantity-draft.Quantity) > 0.001 {
			return failStale()
		}
		var poID uuid.UUID
		err = tx.QueryRow(c.Request.Context(), `INSERT INTO purchase_orders(organization_id,supplier_id,po_number,order_date,expected_delivery_date,total_amount,status) SELECT $1,$2,$3,CURRENT_DATE,CURRENT_DATE+CEIL(average_lead_time_days)::int,0,'DRAFT' FROM suppliers WHERE organization_id=$1 AND id=$2 RETURNING id`, id.OrganizationID, draft.SupplierID, "OP-"+actionID.String()[:8]).Scan(&poID)
		if err != nil {
			return err
		}
		tag, err := tx.Exec(c.Request.Context(), `INSERT INTO purchase_order_items(organization_id,purchase_order_id,product_id,quantity,unit_cost) SELECT $1,$2,id,$3,cost_price FROM products WHERE organization_id=$1 AND id=$4 AND preferred_supplier_id=$5`, id.OrganizationID, poID, draft.Quantity, draft.ProductID, draft.SupplierID)
		if err != nil {
			return err
		}
		if tag.RowsAffected() != 1 {
			return errors.New("product or preferred supplier changed")
		}
		_, err = tx.Exec(c.Request.Context(), `UPDATE purchase_orders SET total_amount=(SELECT SUM(quantity*unit_cost) FROM purchase_order_items WHERE organization_id=$1 AND purchase_order_id=$2) WHERE organization_id=$1 AND id=$2`, id.OrganizationID, poID)
		if err != nil {
			return err
		}
		_, err = tx.Exec(c.Request.Context(), `UPDATE actions SET status='EXECUTED',executed_at=now() WHERE organization_id=$1 AND id=$2`, id.OrganizationID, actionID)
		if err != nil {
			return err
		}
		_, err = tx.Exec(c.Request.Context(), `INSERT INTO audit_logs(organization_id,user_id,action,resource_type,resource_id,metadata,ip_address) VALUES($1,$2,'ACTION_EXECUTED','ACTION',$3,jsonb_build_object('purchase_order_number',$4::text),$5::inet)`, id.OrganizationID, id.UserID, actionID, "OP-"+actionID.String()[:8], c.ClientIP())
		return err
	})
	if err != nil {
		common.Error(c, 500, "DATABASE_ERROR", "Could not execute action")
		return
	}
	if stale {
		common.Error(c, http.StatusConflict, "STALE_ACTION", "Inventory changed; refresh the signal and review a new quantity")
		return
	}
	if !found {
		common.Error(c, 409, "ACTION_CONFLICT", "Action is not approved")
		return
	}
	c.JSON(200, gin.H{"id": actionID, "status": "EXECUTED"})
}
