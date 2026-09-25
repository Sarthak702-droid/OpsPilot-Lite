package organization

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"net/http"
	"regexp"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/auth"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/common"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/database"
)

var settingAmount = regexp.MustCompile(`^\d{1,12}(\.\d{1,2})?$`)
var emailPattern = regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)

func positiveMoney(v string) bool {
	if !settingAmount.MatchString(v) {
		return false
	}
	n, err := strconv.ParseFloat(v, 64)
	return err == nil && n > 0
}
func memberRole(role string) bool {
	return role == "ADMIN" || role == "MANAGER" || role == "STAFF" || role == "VIEWER"
}

func (h Handler) Invite(c *gin.Context) {
	id, _ := auth.Current(c)
	var req struct {
		Email string `json:"email"`
		Role  string `json:"role"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Error(c, 422, "VALIDATION_ERROR", "Invalid invitation JSON")
		return
	}
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	if len(req.Email) > 254 || !emailPattern.MatchString(req.Email) || !memberRole(req.Role) {
		common.Error(c, 422, "VALIDATION_ERROR", "Invalid invitation email or role")
		return
	}
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		common.Error(c, 500, "INTERNAL_ERROR", "Could not create invitation")
		return
	}
	token := base64.RawURLEncoding.EncodeToString(raw)
	hash := sha256.Sum256([]byte(token))
	var inviteID uuid.UUID
	err := database.WithTx(c.Request.Context(), h.DB, func(tx pgx.Tx) error {
		if err := tx.QueryRow(c.Request.Context(), `INSERT INTO organization_invitations(organization_id,email,role,token_hash,invited_by,expires_at) VALUES($1,$2,$3,$4,$5,now()+interval '7 days') RETURNING id`, id.OrganizationID, req.Email, req.Role, hash[:], id.UserID).Scan(&inviteID); err != nil {
			return err
		}
		_, err := tx.Exec(c.Request.Context(), `INSERT INTO audit_logs(organization_id,user_id,action,resource_type,resource_id,metadata) VALUES($1,$2,'INVITATION_CREATED','INVITATION',$3,jsonb_build_object('email',$4::text,'role',$5::text))`, id.OrganizationID, id.UserID, inviteID, req.Email, req.Role)
		return err
	})
	if err != nil {
		common.Error(c, 500, "DATABASE_ERROR", "Could not save invitation")
		return
	}
	c.JSON(201, gin.H{"id": inviteID, "token": token, "email": req.Email, "role": req.Role, "expires_in_days": 7})
}
func (h Handler) AcceptInvite(c *gin.Context) {
	if _, ok := auth.Current(c); ok {
		common.Error(c, 409, "ALREADY_MEMBER", "Leave the current organization before accepting another invitation")
		return
	}
	var req struct {
		Token string `json:"token"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || len(req.Token) < 32 {
		common.Error(c, 422, "VALIDATION_ERROR", "Invalid invitation token")
		return
	}
	hash := sha256.Sum256([]byte(req.Token))
	subject := auth.Subject(c)
	if subject == "" {
		common.Error(c, 401, "UNAUTHORIZED", "Authentication required")
		return
	}
	var org, user uuid.UUID
	var invite uuid.UUID
	var role string
	err := database.WithTx(c.Request.Context(), h.DB, func(tx pgx.Tx) error {
		if err := tx.QueryRow(c.Request.Context(), `SELECT id,organization_id,role FROM organization_invitations WHERE token_hash=$1 AND accepted_at IS NULL AND expires_at>now() FOR UPDATE`, hash[:]).Scan(&invite, &org, &role); err != nil {
			return err
		}
		var exists bool
		if err := tx.QueryRow(c.Request.Context(), `SELECT EXISTS(SELECT 1 FROM users WHERE clerk_user_id=$1 AND status='ACTIVE')`, subject).Scan(&exists); err != nil {
			return err
		}
		if exists {
			return errors.New("existing membership")
		}
		if err := tx.QueryRow(c.Request.Context(), `INSERT INTO users(organization_id,clerk_user_id,role) VALUES($1,$2,$3) RETURNING id`, org, subject, role).Scan(&user); err != nil {
			return err
		}
		if _, err := tx.Exec(c.Request.Context(), `UPDATE organization_invitations SET accepted_at=now() WHERE id=$1`, invite); err != nil {
			return err
		}
		_, err := tx.Exec(c.Request.Context(), `INSERT INTO audit_logs(organization_id,user_id,action,resource_type,resource_id,metadata) VALUES($1,$2,'INVITATION_ACCEPTED','USER',$2,jsonb_build_object('role',$3::text))`, org, user, role)
		return err
	})
	if err != nil {
		common.Error(c, 409, "INVITATION_UNAVAILABLE", "Invitation expired, used, or membership already exists")
		return
	}
	c.JSON(200, gin.H{"organization_id": org, "user_id": user, "role": role})
}
func (h Handler) ListUsers(c *gin.Context) {
	id, _ := auth.Current(c)
	rows, err := h.DB.Query(c.Request.Context(), `SELECT id,name,email,role,status FROM users WHERE organization_id=$1 ORDER BY created_at`, id.OrganizationID)
	if err != nil {
		common.Error(c, 500, "DATABASE_ERROR", "Could not load members")
		return
	}
	defer rows.Close()
	type member struct {
		ID     uuid.UUID `json:"id"`
		Name   string    `json:"name"`
		Email  string    `json:"email"`
		Role   string    `json:"role"`
		Status string    `json:"status"`
	}
	items := make([]member, 0)
	for rows.Next() {
		var x member
		if err := rows.Scan(&x.ID, &x.Name, &x.Email, &x.Role, &x.Status); err != nil {
			common.Error(c, 500, "DATABASE_ERROR", "Could not read members")
			return
		}
		items = append(items, x)
	}
	c.JSON(200, gin.H{"items": items})
}
func (h Handler) UpdateRole(c *gin.Context) {
	id, _ := auth.Current(c)
	target, err := uuid.Parse(c.Param("id"))
	if err != nil {
		common.Error(c, 400, "BAD_REQUEST", "Invalid user ID")
		return
	}
	var req struct {
		Role string `json:"role"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || !memberRole(req.Role) {
		common.Error(c, 422, "VALIDATION_ERROR", "Invalid role")
		return
	}
	if target == id.UserID {
		common.Error(c, 409, "ROLE_CONFLICT", "You cannot change your own role")
		return
	}
	var found bool
	err = database.WithTx(c.Request.Context(), h.DB, func(tx pgx.Tx) error {
		tag, err := tx.Exec(c.Request.Context(), `UPDATE users SET role=$3,updated_at=now() WHERE organization_id=$1 AND id=$2 AND role<>'OWNER'`, id.OrganizationID, target, req.Role)
		if err != nil || tag.RowsAffected() == 0 {
			return err
		}
		found = true
		_, err = tx.Exec(c.Request.Context(), `INSERT INTO audit_logs(organization_id,user_id,action,resource_type,resource_id,metadata) VALUES($1,$2,'MEMBER_ROLE_UPDATED','USER',$3,jsonb_build_object('role',$4::text))`, id.OrganizationID, id.UserID, target, req.Role)
		return err
	})
	if err != nil {
		common.Error(c, 500, "DATABASE_ERROR", "Could not update role")
		return
	}
	if !found {
		common.Error(c, 404, "NOT_FOUND", "Member not found or owner role protected")
		return
	}
	c.JSON(http.StatusOK, gin.H{"id": target, "role": req.Role})
}
