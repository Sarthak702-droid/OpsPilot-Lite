package sales

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/auth"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/common"
)

type Handler struct{ Service Service }

func saleID(c *gin.Context) (uuid.UUID, bool) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		common.Error(c, 400, "BAD_REQUEST", "Invalid sale ID")
		return uuid.Nil, false
	}
	return id, true
}
func saleError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, ErrInvalid):
		common.Error(c, 422, "VALIDATION_ERROR", "Invalid sale fields, line amounts, or workspace references")
	case errors.Is(err, ErrNotFound):
		common.Error(c, 404, "NOT_FOUND", "Sale not found")
	case errors.Is(err, ErrConflict):
		common.Error(c, 409, "SALE_CONFLICT", "Sale is not an editable draft or stock is insufficient")
	default:
		common.Error(c, 500, "DATABASE_ERROR", "Could not update sale")
	}
}
func (h Handler) List(c *gin.Context) {
	id, _ := auth.Current(c)
	items, err := h.Service.List(c.Request.Context(), id.OrganizationID)
	if err != nil {
		saleError(c, err)
		return
	}
	c.JSON(200, gin.H{"items": items})
}
func (h Handler) Get(c *gin.Context) {
	sale, ok := saleID(c)
	if !ok {
		return
	}
	id, _ := auth.Current(c)
	item, err := h.Service.Get(c.Request.Context(), id.OrganizationID, sale)
	if err != nil {
		saleError(c, err)
		return
	}
	c.JSON(200, item)
}
func (h Handler) Save(c *gin.Context) {
	id, _ := auth.Current(c)
	var sale uuid.UUID
	if c.Param("id") != "" {
		var ok bool
		sale, ok = saleID(c)
		if !ok {
			return
		}
	}
	var input Input
	if err := c.ShouldBindJSON(&input); err != nil {
		common.Error(c, 422, "VALIDATION_ERROR", "Invalid sale JSON")
		return
	}
	if sale != uuid.Nil {
		_, err := h.Service.Get(c.Request.Context(), id.OrganizationID, sale)
		if err != nil {
			saleError(c, err)
			return
		}
	}
	result, err := h.Service.Save(c.Request.Context(), id.OrganizationID, id.UserID, sale, input)
	if err != nil {
		saleError(c, err)
		return
	}
	status := http.StatusOK
	if sale == uuid.Nil {
		status = http.StatusCreated
	}
	c.JSON(status, gin.H{"id": result, "status": "DRAFT"})
}
func (h Handler) Complete(c *gin.Context) {
	sale, ok := saleID(c)
	if !ok {
		return
	}
	id, _ := auth.Current(c)
	if err := h.Service.Complete(c.Request.Context(), id.OrganizationID, id.UserID, sale); err != nil {
		saleError(c, err)
		return
	}
	c.JSON(200, gin.H{"id": sale, "status": "COMPLETED"})
}
