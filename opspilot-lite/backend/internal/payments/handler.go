package payments

import (
	"errors"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/auth"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/common"
	"net/http"
)

type Handler struct{ Service Service }

func paymentError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, ErrInvalid):
		common.Error(c, 422, "VALIDATION_ERROR", "Invalid payment fields")
	case errors.Is(err, ErrNotFound):
		common.Error(c, 404, "NOT_FOUND", "Payment or invoice not found")
	case errors.Is(err, ErrConflict):
		common.Error(c, 409, "PAYMENT_CONFLICT", "Payment reference, balance, or reversal state conflicts with this operation")
	default:
		common.Error(c, 500, "DATABASE_ERROR", "Could not update payment")
	}
}
func (h Handler) List(c *gin.Context) {
	id, _ := auth.Current(c)
	items, err := h.Service.List(c.Request.Context(), id.OrganizationID)
	if err != nil {
		paymentError(c, err)
		return
	}
	c.JSON(200, gin.H{"items": items})
}
func (h Handler) Record(c *gin.Context) {
	id, _ := auth.Current(c)
	var input Input
	if err := c.ShouldBindJSON(&input); err != nil {
		common.Error(c, 422, "VALIDATION_ERROR", "Invalid payment JSON")
		return
	}
	result, err := h.Service.Record(c.Request.Context(), id.OrganizationID, id.UserID, input)
	if err != nil {
		paymentError(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"id": result})
}
func (h Handler) Reverse(c *gin.Context) {
	id, _ := auth.Current(c)
	paymentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		common.Error(c, 400, "BAD_REQUEST", "Invalid payment ID")
		return
	}
	var input struct {
		Reason string `json:"reason"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		common.Error(c, 422, "VALIDATION_ERROR", "Invalid reversal JSON")
		return
	}
	if err := h.Service.Reverse(c.Request.Context(), id.OrganizationID, id.UserID, paymentID, input.Reason); err != nil {
		paymentError(c, err)
		return
	}
	c.JSON(200, gin.H{"id": paymentID, "status": "REVERSED"})
}
