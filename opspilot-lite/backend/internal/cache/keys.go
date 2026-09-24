package cache

import "github.com/google/uuid"

func DashboardKey(org uuid.UUID) string { return "dashboard:" + org.String() }
func SignalsKey(org uuid.UUID) string   { return "signals:" + org.String() }
func InventoryKey(org uuid.UUID) string { return "inventory:" + org.String() }
