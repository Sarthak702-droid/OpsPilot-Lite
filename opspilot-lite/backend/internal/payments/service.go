package payments

import (
	"context"
	"errors"
	"regexp"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/database"
)

var ErrInvalid = errors.New("invalid payment")
var ErrConflict = errors.New("payment conflict")
var ErrNotFound = errors.New("payment not found")
var paymentAmount = regexp.MustCompile(`^\d{1,12}(\.\d{1,2})?$`)

type Input struct {
	InvoiceID   uuid.UUID `json:"invoice_id"`
	Amount      string    `json:"amount"`
	PaymentDate string    `json:"payment_date"`
	Method      string    `json:"payment_method"`
	Reference   string    `json:"reference_number"`
}
type Item struct {
	ID             uuid.UUID `json:"id"`
	InvoiceID      uuid.UUID `json:"invoice_id"`
	InvoiceNumber  string    `json:"invoice_number"`
	CustomerID     uuid.UUID `json:"customer_id"`
	Amount         string    `json:"amount"`
	PaymentDate    string    `json:"payment_date"`
	Method         string    `json:"payment_method"`
	Reference      string    `json:"reference_number"`
	ReversedAt     *string   `json:"reversed_at"`
	ReversalReason *string   `json:"reversal_reason"`
}
type Service struct{ DB *pgxpool.Pool }

func (s Service) Record(ctx context.Context, org, user uuid.UUID, x Input) (uuid.UUID, error) {
	amount, parseErr := strconv.ParseFloat(x.Amount, 64)
	if x.InvoiceID == uuid.Nil || !paymentAmount.MatchString(x.Amount) || parseErr != nil || amount <= 0 || len(x.Reference) == 0 || len(x.Reference) > 100 || len(x.Method) > 100 {
		return uuid.Nil, ErrInvalid
	}
	if _, err := time.Parse("2006-01-02", x.PaymentDate); err != nil {
		return uuid.Nil, ErrInvalid
	}
	id := uuid.New()
	err := database.WithTx(ctx, s.DB, func(tx pgx.Tx) error {
		var customer uuid.UUID
		var status string
		var sufficient bool
		err := tx.QueryRow(ctx, `SELECT customer_id,status,outstanding_amount >= $3::numeric FROM invoices WHERE organization_id=$1 AND id=$2 FOR UPDATE`, org, x.InvoiceID, x.Amount).Scan(&customer, &status, &sufficient)
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		if err != nil {
			return err
		}
		if status == "DRAFT" || status == "CANCELLED" || !sufficient {
			return ErrConflict
		}
		_, err = tx.Exec(ctx, `INSERT INTO payments(id,organization_id,customer_id,invoice_id,amount,payment_method,payment_date,reference_number) VALUES($1,$2,$3,$4,$5::numeric,$6,$7::date,$8)`, id, org, customer, x.InvoiceID, x.Amount, x.Method, x.PaymentDate, x.Reference)
		if err != nil {
			return ErrConflict
		}
		if _, err = tx.Exec(ctx, `UPDATE invoices SET paid_amount=paid_amount+$3::numeric,status=CASE WHEN paid_amount+$3::numeric=total THEN 'PAID' ELSE 'PARTIAL' END,updated_at=now() WHERE organization_id=$1 AND id=$2`, org, x.InvoiceID, x.Amount); err != nil {
			return err
		}
		_, err = tx.Exec(ctx, `INSERT INTO audit_logs(organization_id,user_id,action,resource_type,resource_id,metadata) VALUES($1,$2,'PAYMENT_RECORDED','PAYMENT',$3,jsonb_build_object('invoice_id',$4::text,'amount',$5::text))`, org, user, id, x.InvoiceID.String(), x.Amount)
		return err
	})
	return id, err
}
func (s Service) Reverse(ctx context.Context, org, user, paymentID uuid.UUID, reason string) error {
	if len(reason) < 3 || len(reason) > 500 {
		return ErrInvalid
	}
	return database.WithTx(ctx, s.DB, func(tx pgx.Tx) error {
		var invoice uuid.UUID
		var amount string
		var reversed *time.Time
		err := tx.QueryRow(ctx, `SELECT invoice_id,amount::text,reversed_at FROM payments WHERE organization_id=$1 AND id=$2 FOR UPDATE`, org, paymentID).Scan(&invoice, &amount, &reversed)
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		if err != nil {
			return err
		}
		if reversed != nil {
			return ErrConflict
		}
		var paid string
		if err := tx.QueryRow(ctx, `SELECT paid_amount::text FROM invoices WHERE organization_id=$1 AND id=$2 FOR UPDATE`, org, invoice).Scan(&paid); err != nil {
			return err
		}
		var updated uuid.UUID
		err = tx.QueryRow(ctx, `UPDATE invoices SET paid_amount=paid_amount-$3::numeric,status=CASE WHEN paid_amount-$3::numeric=total THEN 'PAID' WHEN paid_amount-$3::numeric>0 THEN 'PARTIAL' WHEN due_date<CURRENT_DATE THEN 'OVERDUE' ELSE 'PENDING' END,updated_at=now() WHERE organization_id=$1 AND id=$2 AND paid_amount >= $3::numeric RETURNING id`, org, invoice, amount).Scan(&updated)
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrConflict
		}
		if err != nil {
			return err
		}
		if _, err = tx.Exec(ctx, `UPDATE payments SET reversed_at=now(),reversed_by=$3,reversal_reason=$4 WHERE organization_id=$1 AND id=$2`, org, paymentID, user, reason); err != nil {
			return err
		}
		_, err = tx.Exec(ctx, `INSERT INTO audit_logs(organization_id,user_id,action,resource_type,resource_id,metadata) VALUES($1,$2,'PAYMENT_REVERSED','PAYMENT',$3,jsonb_build_object('reason',$4::text,'invoice_id',$5::text))`, org, user, paymentID, reason, invoice.String())
		return err
	})
}
func (s Service) List(ctx context.Context, org uuid.UUID) ([]Item, error) {
	rows, err := s.DB.Query(ctx, `SELECT p.id,p.invoice_id,i.invoice_number,p.customer_id,p.amount::text,p.payment_date::text,p.payment_method,p.reference_number,p.reversed_at::text,p.reversal_reason FROM payments p JOIN invoices i ON i.organization_id=p.organization_id AND i.id=p.invoice_id WHERE p.organization_id=$1 ORDER BY p.payment_date DESC,p.id DESC LIMIT 200`, org)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]Item, 0)
	for rows.Next() {
		var x Item
		if err := rows.Scan(&x.ID, &x.InvoiceID, &x.InvoiceNumber, &x.CustomerID, &x.Amount, &x.PaymentDate, &x.Method, &x.Reference, &x.ReversedAt, &x.ReversalReason); err != nil {
			return nil, err
		}
		items = append(items, x)
	}
	return items, rows.Err()
}
