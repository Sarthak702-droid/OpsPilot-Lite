package organization

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/auth"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/common"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/database"
	"net/http"
)

type Settings struct {
	OverstockDays      int    `json:"overstock_days"`
	HighValueThreshold string `json:"high_value_threshold"`
}

func (h Handler) GetSettings(c *gin.Context) {
	id, _ := auth.Current(c)
	var x Settings
	err := h.DB.QueryRow(c.Request.Context(), `SELECT COALESCE(s.overstock_days,90),COALESCE(s.high_value_threshold,100000)::text FROM organizations o LEFT JOIN organization_settings s ON s.organization_id=o.id WHERE o.id=$1`, id.OrganizationID).Scan(&x.OverstockDays, &x.HighValueThreshold)
	if err != nil {
		common.Error(c, 500, "DATABASE_ERROR", "Could not load settings")
		return
	}
	c.JSON(200, x)
}
func (h Handler) UpdateSettings(c *gin.Context) {
	id, _ := auth.Current(c)
	var x Settings
	if err := c.ShouldBindJSON(&x); err != nil || x.OverstockDays < 30 || x.OverstockDays > 365 || !positiveMoney(x.HighValueThreshold) {
		common.Error(c, 422, "VALIDATION_ERROR", "Invalid risk thresholds")
		return
	}
	err := database.WithTx(c.Request.Context(), h.DB, func(tx pgx.Tx) error {
		if _, err := tx.Exec(c.Request.Context(), `INSERT INTO organization_settings(organization_id,overstock_days,high_value_threshold) VALUES($1,$2,$3::numeric) ON CONFLICT(organization_id) DO UPDATE SET overstock_days=EXCLUDED.overstock_days,high_value_threshold=EXCLUDED.high_value_threshold,updated_at=now()`, id.OrganizationID, x.OverstockDays, x.HighValueThreshold); err != nil {
			return err
		}
		_, err := tx.Exec(c.Request.Context(), `INSERT INTO audit_logs(organization_id,user_id,action,resource_type,resource_id,metadata) VALUES($1,$2,'ORGANIZATION_SETTINGS_UPDATED','ORGANIZATION',$1,jsonb_build_object('overstock_days',$3::int,'high_value_threshold',$4::text))`, id.OrganizationID, id.UserID, x.OverstockDays, x.HighValueThreshold)
		return err
	})
	if err != nil {
		common.Error(c, 500, "DATABASE_ERROR", "Could not update settings")
		return
	}
	c.JSON(http.StatusOK, x)
}
