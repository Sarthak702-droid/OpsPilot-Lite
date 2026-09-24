package server

import (
	"context"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/actions"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/ai"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/auth"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/config"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/customers"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/dashboard"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/database"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/importer"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/inventory"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/invoices"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/organization"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/products"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/signals"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/storage"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/suppliers"
	"github.com/redis/go-redis/v9"
	"net/http"
	"time"
)

func New(cfg config.Config, db *pgxpool.Pool, redis *redis.Client) *gin.Engine {
	r := gin.New()
	r.Use(gin.Recovery(), requestID(), tracing(), logging(), cors(cfg.FrontendOrigin))
	r.GET("/health", func(c *gin.Context) { c.JSON(200, gin.H{"status": "ok"}) })
	r.GET("/ready", func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
		defer cancel()
		if !database.Healthy(ctx, db) || redis.Ping(ctx).Err() != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"status": "unavailable"})
			return
		}
		c.JSON(200, gin.H{"status": "ready"})
	})
	verifier := auth.NewVerifier(cfg.ClerkJWKSURL, cfg.ClerkIssuer)
	api := r.Group("/api")
	api.Use(auth.Authenticate(verifier, db), rateLimit(redis, "api", 120, time.Minute))
	org := organization.Handler{DB: db}
	api.GET("/organization/me", org.Me)
	api.POST("/organization", org.Create)
	protected := api.Group("")
	protected.Use(auth.RequireMembership())
	sr := signals.Repository{DB: db}
	inv := inventory.Service{DB: db}
	sup := suppliers.Service{DB: db}
	protected.GET("/dashboard", dashboard.Handler{Service: dashboard.Service{DB: db, Redis: redis, Signals: sr}}.Get)
	protected.GET("/products", products.Handler{DB: db}.List)
	protected.GET("/inventory", inventory.Handler{Service: inv}.List)
	protected.GET("/customers", customers.Handler{DB: db}.List)
	protected.GET("/invoices", invoices.Handler{DB: db}.List)
	protected.GET("/suppliers", suppliers.Handler{Service: sup}.List)
	protected.GET("/signals", signals.Handler{Repository: sr}.List)
	protected.POST("/import", rateLimit(redis, "import", 10, time.Minute), auth.RequireRole("OWNER", "ADMIN", "MANAGER"), importer.Handler{Service: importer.Service{DB: db}}.Import)
	protected.POST("/import/preview", rateLimit(redis, "import", 10, time.Minute), auth.RequireRole("OWNER", "ADMIN", "MANAGER"), importer.Handler{Service: importer.Service{DB: db}}.Preview)
	var objectStore storage.Store
	if cfg.R2AccountID != "" && cfg.R2AccessKey != "" && cfg.R2SecretKey != "" && cfg.R2Bucket != "" {
		if r2, err := storage.NewR2(context.Background(), cfg.R2AccountID, cfg.R2AccessKey, cfg.R2SecretKey, cfg.R2Bucket, cfg.R2Endpoint); err == nil {
			objectStore = r2
		}
	}
	documents := importer.DocumentHandler{Service: importer.DocumentService{DB: db, Store: objectStore, AI: ai.NewClient(cfg.MimoBaseURL, cfg.MimoModel, cfg.MimoAPIKey, cfg.MimoTimeout)}}
	protected.POST("/import/pdf/preview", rateLimit(redis, "import", 10, time.Minute), auth.RequireRole("OWNER", "ADMIN", "MANAGER"), documents.Preview)
	protected.POST("/import/pdf/commit", rateLimit(redis, "import", 10, time.Minute), auth.RequireRole("OWNER", "ADMIN", "MANAGER"), documents.Commit)
	ah := actions.Handler{DB: db}
	protected.GET("/actions", ah.List)
	protected.POST("/actions/:id/approve", auth.RequireRole("OWNER", "ADMIN", "MANAGER"), ah.Decide(true))
	protected.POST("/actions/:id/reject", auth.RequireRole("OWNER", "ADMIN", "MANAGER"), ah.Decide(false))
	protected.POST("/actions/:id/execute", auth.RequireRole("OWNER", "ADMIN", "MANAGER"), ah.Execute)
	a := ai.Handler{Client: ai.NewClient(cfg.MimoBaseURL, cfg.MimoModel, cfg.MimoAPIKey, cfg.MimoTimeout), Signals: sr, Inventory: inv, Repo: ai.Repository{DB: db}}
	protected.POST("/ai/ask", rateLimit(redis, "ai", 20, time.Minute), a.Ask)
	protected.POST("/ai/stream", rateLimit(redis, "ai", 20, time.Minute), a.Stream)
	protected.GET("/ai/health", a.Health)
	protected.GET("/recommendations", a.Recommendations)
	return r
}
