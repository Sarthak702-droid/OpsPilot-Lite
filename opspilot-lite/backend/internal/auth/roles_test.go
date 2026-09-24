package auth

import (
	"github.com/gin-gonic/gin"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestRoleMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, test := range []struct {
		role   string
		status int
	}{{"STAFF", 403}, {"VIEWER", 403}, {"MANAGER", 200}, {"OWNER", 200}} {
		r := gin.New()
		r.GET("/approve", func(c *gin.Context) { c.Set(identityKey, Identity{Role: test.role}); c.Next() }, RequireRole("OWNER", "ADMIN", "MANAGER"), func(c *gin.Context) { c.Status(200) })
		response := httptest.NewRecorder()
		r.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/approve", nil))
		if response.Code != test.status {
			t.Errorf("role %s got %d want %d", test.role, response.Code, test.status)
		}
	}
}
