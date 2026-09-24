package organization

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/auth"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/common"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/database"
	"net/http"
	"strings"
)

type Handler struct{ DB *pgxpool.Pool }
type CreateRequest struct {
	Name     string `json:"name" binding:"required"`
	Industry string `json:"industry"`
	Currency string `json:"currency"`
	Timezone string `json:"timezone"`
}

func (h Handler) Create(c *gin.Context) {
	if _, ok := auth.Current(c); ok {
		common.Error(c, http.StatusConflict, "ALREADY_ONBOARDED", "User already belongs to an organization")
		return
	}
	sub := auth.Subject(c)
	if sub == "" {
		common.Error(c, 401, "UNAUTHORIZED", "Authentication required")
		return
	}
	var req CreateRequest
	if err := c.ShouldBindJSON(&req); err != nil || len(strings.TrimSpace(req.Name)) < 2 {
		common.Error(c, 422, "VALIDATION_ERROR", "Organization name is required")
		return
	}
	if req.Currency == "" {
		req.Currency = "INR"
	}
	if req.Timezone == "" {
		req.Timezone = "Asia/Kolkata"
	}
	if len(req.Currency) != 3 {
		common.Error(c, 422, "VALIDATION_ERROR", "Currency must be a 3-letter code")
		return
	}
	var orgID, userID uuid.UUID
	err := database.WithTx(c.Request.Context(), h.DB, func(tx pgx.Tx) error {
		if err := tx.QueryRow(c.Request.Context(), `INSERT INTO organizations(name,industry,currency,timezone) VALUES($1,$2,$3,$4) RETURNING id`, strings.TrimSpace(req.Name), req.Industry, strings.ToUpper(req.Currency), req.Timezone).Scan(&orgID); err != nil {
			return err
		}
		return tx.QueryRow(c.Request.Context(), `INSERT INTO users(organization_id,clerk_user_id,role) VALUES($1,$2,'OWNER') RETURNING id`, orgID, sub).Scan(&userID)
	})
	if err != nil {
		common.Error(c, 500, "DATABASE_ERROR", "Could not create organization")
		return
	}
	c.JSON(201, gin.H{"id": orgID, "user_id": userID, "name": req.Name})
}

func (h Handler) Me(c *gin.Context) {
	id, ok := auth.Current(c)
	if !ok {
		c.JSON(200, gin.H{"onboarded": false})
		return
	}
	var name, currency string
	err := h.DB.QueryRow(c.Request.Context(), `SELECT name,currency FROM organizations WHERE id=$1`, id.OrganizationID).Scan(&name, &currency)
	if err != nil {
		common.Error(c, 500, "DATABASE_ERROR", "Could not load organization")
		return
	}
	c.JSON(200, gin.H{"onboarded": true, "organization_id": id.OrganizationID, "user_id": id.UserID, "role": id.Role, "name": name, "currency": currency})
}
