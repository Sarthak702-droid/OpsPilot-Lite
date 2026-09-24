package products

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/auth"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/common"
)

type Handler struct{ DB *pgxpool.Pool }

func (h Handler) List(c *gin.Context) {
	id, _ := auth.Current(c)
	rows, err := h.DB.Query(c.Request.Context(), `SELECT id,sku,name,category,current_stock::float8,selling_price::float8 FROM products WHERE organization_id=$1 ORDER BY name LIMIT 500`, id.OrganizationID)
	if err != nil {
		common.Error(c, 500, "DATABASE_ERROR", "Could not load products")
		return
	}
	defer rows.Close()
	items := make([]gin.H, 0)
	for rows.Next() {
		var key, sku, name, category string
		var stock, price float64
		if err := rows.Scan(&key, &sku, &name, &category, &stock, &price); err != nil {
			common.Error(c, 500, "DATABASE_ERROR", "Could not read products")
			return
		}
		items = append(items, gin.H{"id": key, "sku": sku, "name": name, "category": category, "current_stock": stock, "selling_price": price})
	}
	c.JSON(200, gin.H{"items": items})
}
