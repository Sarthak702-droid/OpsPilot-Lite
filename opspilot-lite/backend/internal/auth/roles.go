package auth

import (
	"github.com/gin-gonic/gin"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/common"
	"net/http"
)

func RequireRole(allowed ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := Current(c)
		if !ok {
			common.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
			return
		}
		for _, role := range allowed {
			if id.Role == role {
				c.Next()
				return
			}
		}
		common.Error(c, http.StatusForbidden, "FORBIDDEN", "Insufficient permission")
	}
}
