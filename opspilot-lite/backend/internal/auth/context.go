package auth

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Identity struct {
	UserID, OrganizationID uuid.UUID
	ClerkUserID, Role      string
}

const identityKey = "identity"
const subjectKey = "clerk_subject"

func Current(c *gin.Context) (Identity, bool) {
	v, ok := c.Get(identityKey)
	if !ok {
		return Identity{}, false
	}
	id, ok := v.(Identity)
	return id, ok
}
func Subject(c *gin.Context) string { return c.GetString(subjectKey) }
