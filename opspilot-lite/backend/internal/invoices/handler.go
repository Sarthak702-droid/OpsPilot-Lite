package invoices

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/auth"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/common"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/payments"
	"time"
)

type Item struct {
	ID            uuid.UUID `json:"id"`
	InvoiceNumber string    `json:"invoice_number"`
	Customer      string    `json:"customer"`
	InvoiceDate   time.Time `json:"invoice_date"`
	DueDate       time.Time `json:"due_date"`
	Total         float64   `json:"total"`
	Paid          float64   `json:"paid"`
	Outstanding   float64   `json:"outstanding"`
	Status        string    `json:"status"`
	DaysOverdue   int       `json:"days_overdue"`
	Risk          string    `json:"risk"`
}
type Handler struct{ DB *pgxpool.Pool }

func (h Handler) List(c *gin.Context) {
	id, _ := auth.Current(c)
	rows, err := h.DB.Query(c.Request.Context(), `SELECT i.id,i.invoice_number,c.name,i.invoice_date,i.due_date,i.total::float8,i.paid_amount::float8,i.outstanding_amount::float8,i.status FROM invoices i JOIN customers c ON c.id=i.customer_id AND c.organization_id=i.organization_id WHERE i.organization_id=$1 ORDER BY i.due_date ASC LIMIT 500`, id.OrganizationID)
	if err != nil {
		common.Error(c, 500, "DATABASE_ERROR", "Could not load invoices")
		return
	}
	defer rows.Close()
	items := make([]Item, 0)
	for rows.Next() {
		var x Item
		if err := rows.Scan(&x.ID, &x.InvoiceNumber, &x.Customer, &x.InvoiceDate, &x.DueDate, &x.Total, &x.Paid, &x.Outstanding, &x.Status); err != nil {
			common.Error(c, 500, "DATABASE_ERROR", "Could not read invoices")
			return
		}
		if x.Outstanding > 0 {
			x.DaysOverdue = payments.DaysOverdue(x.DueDate, time.Now())
			x.Risk = payments.Severity(x.DaysOverdue)
		}
		items = append(items, x)
	}
	c.JSON(200, gin.H{"items": items})
}
