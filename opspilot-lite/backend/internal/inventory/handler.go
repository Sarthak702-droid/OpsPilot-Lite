package inventory

import (
	"github.com/gin-gonic/gin"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/auth"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/common"
	"net/http"
)

type Handler struct{ Service Service }

func (h Handler) List(c *gin.Context) {
	id, _ := auth.Current(c)
	items, err := h.Service.List(c.Request.Context(), id.OrganizationID)
	if err != nil {
		common.Error(c, 500, "DATABASE_ERROR", "Could not load inventory")
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}
