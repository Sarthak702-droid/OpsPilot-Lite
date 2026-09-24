package customers

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/auth"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/common"
	"time"
)

type Item struct {
	ID              uuid.UUID  `json:"id"`
	Name            string     `json:"name"`
	BusinessName    string     `json:"business_name"`
	Email           string     `json:"email"`
	Outstanding     float64    `json:"outstanding"`
	LifetimeRevenue float64    `json:"lifetime_revenue"`
	LastPurchase    *time.Time `json:"last_purchase"`
}
type Handler struct{ DB *pgxpool.Pool }

func (h Handler) List(c *gin.Context) {
	id, _ := auth.Current(c)
	rows, err := h.DB.Query(c.Request.Context(), `SELECT c.id,c.name,c.business_name,c.email,COALESCE(i.outstanding,0)::float8,COALESCE(s.revenue,0)::float8,s.last_purchase FROM customers c LEFT JOIN LATERAL (SELECT SUM(outstanding_amount) outstanding FROM invoices WHERE organization_id=c.organization_id AND customer_id=c.id AND status NOT IN ('CANCELLED','DRAFT')) i ON true LEFT JOIN LATERAL (SELECT SUM(total_amount) revenue,MAX(sale_date) last_purchase FROM sales WHERE organization_id=c.organization_id AND customer_id=c.id) s ON true WHERE c.organization_id=$1 ORDER BY c.name LIMIT 500`, id.OrganizationID)
	if err != nil {
		common.Error(c, 500, "DATABASE_ERROR", "Could not load customers")
		return
	}
	defer rows.Close()
	items := make([]Item, 0)
	for rows.Next() {
		var x Item
		if err := rows.Scan(&x.ID, &x.Name, &x.BusinessName, &x.Email, &x.Outstanding, &x.LifetimeRevenue, &x.LastPurchase); err != nil {
			common.Error(c, 500, "DATABASE_ERROR", "Could not read customers")
			return
		}
		items = append(items, x)
	}
	c.JSON(200, gin.H{"items": items})
}
