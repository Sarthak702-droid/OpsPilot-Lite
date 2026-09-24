package server

import (
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/auth"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/common"
	"github.com/redis/go-redis/v9"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/trace"
)

func requestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.GetHeader("X-Request-ID")
		if _, err := uuid.Parse(id); err != nil {
			id = uuid.NewString()
		}
		c.Set("request_id", id)
		c.Header("X-Request-ID", id)
		c.Next()
	}
}
func tracing() gin.HandlerFunc {
	return func(c *gin.Context) {
		parent := otel.GetTextMapPropagator().Extract(c.Request.Context(), propagation.HeaderCarrier(c.Request.Header))
		ctx, span := otel.Tracer("opspilot/http").Start(parent, c.Request.Method+" "+c.Request.URL.Path, trace.WithSpanKind(trace.SpanKindServer))
		defer span.End()
		c.Request = c.Request.WithContext(ctx)
		c.Next()
		identity, _ := auth.Current(c)
		span.SetAttributes(attribute.String("request.id", c.GetString("request_id")), attribute.String("organization.id", identity.OrganizationID.String()), attribute.String("http.route", c.FullPath()), attribute.Int("http.response.status_code", c.Writer.Status()))
		if c.Writer.Status() >= 500 {
			span.SetStatus(codes.Error, "server error")
		}
	}
}
func logging() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()
		identity, _ := auth.Current(c)
		log.Printf("request_id=%s organization_id=%s method=%s path=%s status=%d duration_ms=%d", c.GetString("request_id"), identity.OrganizationID, c.Request.Method, c.FullPath(), c.Writer.Status(), time.Since(start).Milliseconds())
	}
}
func rateLimit(client *redis.Client, scope string, limit int, window time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, ok := auth.Current(c)
		if !ok {
			c.Next()
			return
		}
		key := "ratelimit:" + scope + ":" + id.UserID.String() + ":" + time.Now().UTC().Format("200601021504")
		count, err := client.Incr(c.Request.Context(), key).Result()
		if err != nil {
			common.Error(c, 503, "RATE_LIMIT_UNAVAILABLE", "Request control temporarily unavailable")
			return
		}
		if count == 1 {
			_ = client.Expire(c.Request.Context(), key, window).Err()
		}
		if count > int64(limit) {
			common.Error(c, 429, "RATE_LIMITED", "Too many requests")
			return
		}
		c.Next()
	}
}
func cors(origin string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.GetHeader("Origin") == origin {
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Vary", "Origin")
			c.Header("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Request-ID")
			c.Header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		}
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}
