package purchaseorders

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/auth"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/common"
)

type Handler struct{ Service Service }

func orderID(c *gin.Context) (uuid.UUID, bool) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		common.Error(c, 400, "BAD_REQUEST", "Invalid purchase order ID")
		return uuid.Nil, false
	}
	return id, true
}
func orderError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, ErrInvalid):
		common.Error(c, 422, "VALIDATION_ERROR", "Invalid purchase order fields or workspace references")
	case errors.Is(err, ErrNotFound):
		common.Error(c, 404, "NOT_FOUND", "Purchase order not found")
	case errors.Is(err, ErrConflict):
		common.Error(c, 409, "PURCHASE_ORDER_CONFLICT", "Purchase order state, quantity, or reference conflicts with this operation")
	default:
		common.Error(c, 500, "DATABASE_ERROR", "Could not update purchase order")
	}
}
func (h Handler) List(c *gin.Context) {
	id, _ := auth.Current(c)
	items, err := h.Service.List(c.Request.Context(), id.OrganizationID)
	if err != nil {
		orderError(c, err)
		return
	}
	c.JSON(200, gin.H{"items": items})
}
func (h Handler) Get(c *gin.Context) {
	po, ok := orderID(c)
	if !ok {
		return
	}
	id, _ := auth.Current(c)
	item, err := h.Service.Get(c.Request.Context(), id.OrganizationID, po)
	if err != nil {
		orderError(c, err)
		return
	}
	c.JSON(200, item)
}
func (h Handler) Save(c *gin.Context) {
	id, _ := auth.Current(c)
	var po uuid.UUID
	if c.Param("id") != "" {
		var ok bool
		po, ok = orderID(c)
		if !ok {
			return
		}
		if _, err := h.Service.Get(c.Request.Context(), id.OrganizationID, po); err != nil {
			orderError(c, err)
			return
		}
	}
	var input Input
	if err := c.ShouldBindJSON(&input); err != nil {
		common.Error(c, 422, "VALIDATION_ERROR", "Invalid purchase order JSON")
		return
	}
	result, err := h.Service.Save(c.Request.Context(), id.OrganizationID, id.UserID, po, input)
	if err != nil {
		orderError(c, err)
		return
	}
	status := http.StatusOK
	if po == uuid.Nil {
		status = http.StatusCreated
	}
	c.JSON(status, gin.H{"id": result, "status": "DRAFT"})
}
func (h Handler) Receive(c *gin.Context) {
	po, ok := orderID(c)
	if !ok {
		return
	}
	id, _ := auth.Current(c)
	var input ReceiptInput
	if err := c.ShouldBindJSON(&input); err != nil {
		common.Error(c, 422, "VALIDATION_ERROR", "Invalid receipt JSON")
		return
	}
	if err := h.Service.Receive(c.Request.Context(), id.OrganizationID, id.UserID, po, input); err != nil {
		orderError(c, err)
		return
	}
	c.JSON(200, gin.H{"id": po, "status": "RECEIVED"})
}
func (h Handler) RequestSend(c *gin.Context) {
	po, ok := orderID(c)
	if !ok {
		return
	}
	id, _ := auth.Current(c)
	action, err := h.Service.RequestSend(c.Request.Context(), id.OrganizationID, id.UserID, po)
	if err != nil {
		orderError(c, err)
		return
	}
	c.JSON(201, gin.H{"action_id": action, "status": "AWAITING_APPROVAL"})
}
func (h Handler) ResolveSend(c *gin.Context) {
	po, ok := orderID(c)
	if !ok {
		return
	}
	id, _ := auth.Current(c)
	var input struct {
		Outcome string `json:"outcome"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		common.Error(c, 422, "VALIDATION_ERROR", "Invalid send outcome")
		return
	}
	if err := h.Service.ResolveSend(c.Request.Context(), id.OrganizationID, id.UserID, po, input.Outcome); err != nil {
		orderError(c, err)
		return
	}
	c.JSON(200, gin.H{"id": po, "send_state": input.Outcome})
}
func (h Handler) Cancel(c *gin.Context) {
	po, ok := orderID(c)
	if !ok {
		return
	}
	id, _ := auth.Current(c)
	if err := h.Service.CancelDraft(c.Request.Context(), id.OrganizationID, id.UserID, po); err != nil {
		orderError(c, err)
		return
	}
	c.JSON(200, gin.H{"id": po, "status": "CANCELLED"})
}
