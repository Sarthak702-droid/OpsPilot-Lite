package signals

import (
	"github.com/gin-gonic/gin"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/auth"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/common"
)

type Handler struct{ Repository Repository }

func (h Handler) List(c *gin.Context) {
	id, _ := auth.Current(c)
	items, err := h.Repository.List(c.Request.Context(), id.OrganizationID)
	if err != nil {
		common.Error(c, 500, "DATABASE_ERROR", "Could not load signals")
		return
	}
	c.JSON(200, gin.H{"items": items})
}
