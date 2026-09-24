package dashboard

import (
	"github.com/gin-gonic/gin"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/auth"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/common"
)

type Handler struct{ Service Service }

func (h Handler) Get(c *gin.Context) {
	id, _ := auth.Current(c)
	x, err := h.Service.Get(c.Request.Context(), id.OrganizationID)
	if err != nil {
		common.Error(c, 500, "DATABASE_ERROR", "Could not load dashboard")
		return
	}
	c.JSON(200, x)
}
