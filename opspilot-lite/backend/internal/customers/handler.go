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
	ID                      uuid.UUID  `json:"id"`
	Name                    string     `json:"name"`
	BusinessName            string     `json:"business_name"`
	Email                   string     `json:"email"`
	Outstanding             float64    `json:"outstanding"`
	LifetimeRevenue         float64    `json:"lifetime_revenue"`
	LastPurchase            *time.Time `json:"last_purchase"`
	OverdueInvoiceCount     int        `json:"overdue_invoice_count"`
	AveragePaymentDelayDays *float64   `json:"average_payment_delay_days"`
	LastPaymentDate         *time.Time `json:"last_payment_date"`
}
type Handler struct{ DB *pgxpool.Pool }

func (h Handler) List(c *gin.Context) {
	id, _ := auth.Current(c)
	rows, err := h.DB.Query(c.Request.Context(), `SELECT c.id,c.name,c.business_name,c.email,COALESCE(i.outstanding,0)::float8,COALESCE(s.revenue,0)::float8,s.last_purchase,COALESCE(i.overdue_count,0)::int,p.average_delay::float8,p.last_payment
		FROM customers c
		LEFT JOIN LATERAL (SELECT SUM(outstanding_amount) outstanding,COUNT(*) FILTER(WHERE due_date<CURRENT_DATE AND outstanding_amount>0) overdue_count FROM invoices WHERE organization_id=c.organization_id AND customer_id=c.id AND status NOT IN ('CANCELLED','DRAFT')) i ON true
		LEFT JOIN LATERAL (SELECT SUM(total_amount) revenue,MAX(sale_date) last_purchase FROM sales WHERE organization_id=c.organization_id AND customer_id=c.id AND status='COMPLETED') s ON true
		LEFT JOIN LATERAL (SELECT AVG(GREATEST(p.payment_date-i.due_date,0)) average_delay,MAX(p.payment_date) last_payment FROM payments p JOIN invoices i ON i.organization_id=p.organization_id AND i.id=p.invoice_id WHERE p.organization_id=c.organization_id AND p.customer_id=c.id AND p.reversed_at IS NULL) p ON true
		WHERE c.organization_id=$1 ORDER BY c.name LIMIT 500`, id.OrganizationID)
	if err != nil {
		common.Error(c, 500, "DATABASE_ERROR", "Could not load customers")
		return
	}
	defer rows.Close()
	items := make([]Item, 0)
	for rows.Next() {
		var x Item
		if err := rows.Scan(&x.ID, &x.Name, &x.BusinessName, &x.Email, &x.Outstanding, &x.LifetimeRevenue, &x.LastPurchase, &x.OverdueInvoiceCount, &x.AveragePaymentDelayDays, &x.LastPaymentDate); err != nil {
			common.Error(c, 500, "DATABASE_ERROR", "Could not read customers")
			return
		}
		items = append(items, x)
	}
	c.JSON(200, gin.H{"items": items})
}
