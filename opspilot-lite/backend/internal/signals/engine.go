package signals

import (
	"context"
	"fmt"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/actions"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/inventory"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/payments"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/suppliers"
	"time"
)

type Engine struct {
	DB         *pgxpool.Pool
	Repository Repository
	Inventory  inventory.Service
	Suppliers  suppliers.Service
}

func (e Engine) Run(ctx context.Context) error {
	rows, err := e.DB.Query(ctx, `SELECT id FROM organizations`)
	if err != nil {
		return err
	}
	orgs := make([]uuid.UUID, 0)
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			rows.Close()
			return err
		}
		orgs = append(orgs, id)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return err
	}
	for _, org := range orgs {
		if err := e.RunOrganization(ctx, org); err != nil {
			return fmt.Errorf("organization %s: %w", org, err)
		}
	}
	_, err = e.DB.Exec(ctx, `UPDATE business_signals SET status='EXPIRED' WHERE status='ACTIVE' AND expires_at<now()`)
	return err
}
func (e Engine) RunOrganization(ctx context.Context, org uuid.UUID) error {
	items, err := e.Inventory.List(ctx, org)
	if err != nil {
		return err
	}
	for _, x := range items {
		if x.Risk == "HIGH" || x.Risk == "CRITICAL" {
			v := x.Metrics.StockDaysRemaining
			err = e.Repository.Upsert(ctx, org, Signal{Type: "STOCKOUT_RISK", EntityType: "PRODUCT", EntityID: x.ID, Severity: x.Risk, Title: x.Name + " may stock out", Description: fmt.Sprintf("%.1f days of stock versus %.1f days supplier lead time", v, x.Metrics.SupplierLeadTime), MetricName: "stock_days_remaining", MetricValue: &v})
			if err == nil && x.Metrics.RecommendedOrderQuantity > 0 {
				var supplierID uuid.UUID
				if lookup := e.DB.QueryRow(ctx, `SELECT preferred_supplier_id FROM products WHERE organization_id=$1 AND id=$2 AND preferred_supplier_id IS NOT NULL`, org, x.ID).Scan(&supplierID); lookup == nil {
					err = actions.Service{DB: e.DB}.EnsurePurchaseOrder(ctx, org, actions.PurchaseOrderDraft{ProductID: x.ID, SupplierID: supplierID, Quantity: x.Metrics.RecommendedOrderQuantity, Reason: fmt.Sprintf("%.1f stock days below %.1f supplier lead days", v, x.Metrics.SupplierLeadTime)})
				}
			}
		} else {
			err = e.Repository.Resolve(ctx, org, "STOCKOUT_RISK", "PRODUCT", x.ID)
		}
		if err != nil {
			return err
		}
	}
	rows, err := e.DB.Query(ctx, `SELECT id,invoice_number,due_date,outstanding_amount::float8 FROM invoices WHERE organization_id=$1 AND outstanding_amount>0 AND status NOT IN ('CANCELLED','DRAFT')`, org)
	if err != nil {
		return err
	}
	type invoice struct {
		id     uuid.UUID
		number string
		due    time.Time
		amount float64
	}
	invoices := make([]invoice, 0)
	for rows.Next() {
		var x invoice
		if err := rows.Scan(&x.id, &x.number, &x.due, &x.amount); err != nil {
			rows.Close()
			return err
		}
		invoices = append(invoices, x)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return err
	}
	for _, x := range invoices {
		days := payments.DaysOverdue(x.due, time.Now())
		if days > 0 {
			v := float64(days)
			err = e.Repository.Upsert(ctx, org, Signal{Type: "PAYMENT_OVERDUE", EntityType: "INVOICE", EntityID: x.id, Severity: payments.Severity(days), Title: "Invoice " + x.number + " overdue", Description: fmt.Sprintf("%.0f outstanding, %d days overdue", x.amount, days), MetricName: "days_overdue", MetricValue: &v})
		} else {
			err = e.Repository.Resolve(ctx, org, "PAYMENT_OVERDUE", "INVOICE", x.id)
		}
		if err != nil {
			return err
		}
	}
	sup, err := e.Suppliers.List(ctx, org)
	if err != nil {
		return err
	}
	for _, x := range sup {
		if x.Risk == "HIGH" || x.Risk == "MEDIUM" {
			v := x.OnTimeRate
			err = e.Repository.Upsert(ctx, org, Signal{Type: "SUPPLIER_DELAY", EntityType: "SUPPLIER", EntityID: x.ID, Severity: x.Risk, Title: x.Name + " delivery reliability is falling", Description: fmt.Sprintf("%.0f%% on-time across %d delivered orders", v, x.Delivered), MetricName: "on_time_rate", MetricValue: &v})
		} else {
			err = e.Repository.Resolve(ctx, org, "SUPPLIER_DELAY", "SUPPLIER", x.ID)
		}
		if err != nil {
			return err
		}
	}
	return nil
}
