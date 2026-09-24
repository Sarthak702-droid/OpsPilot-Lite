package auth

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/common"
	"net/http"
)

func Authenticate(verifier *Verifier, pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		raw := Bearer(c.GetHeader("Authorization"))
		if raw == "" {
			common.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Bearer token required")
			return
		}
		sub, err := verifier.Subject(c.Request.Context(), raw)
		if err != nil {
			common.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid session")
			return
		}
		c.Set(subjectKey, sub)
		var id Identity
		id.ClerkUserID = sub
		err = pool.QueryRow(c.Request.Context(), `SELECT id,organization_id,role FROM users WHERE clerk_user_id=$1 AND status='ACTIVE' ORDER BY created_at LIMIT 1`, sub).Scan(&id.UserID, &id.OrganizationID, &id.Role)
		if err == nil {
			c.Set(identityKey, id)
		}
		c.Next()
	}
}

func RequireMembership() gin.HandlerFunc {
	return func(c *gin.Context) {
		if _, ok := Current(c); !ok {
			common.Error(c, http.StatusForbidden, "ONBOARDING_REQUIRED", "Create or join an organization first")
			return
		}
		c.Next()
	}
}
