package payments

import "time"

func DaysOverdue(due, now time.Time) int {
	days := int(now.UTC().Truncate(24*time.Hour).Sub(due.UTC().Truncate(24*time.Hour)).Hours() / 24)
	if days < 0 {
		return 0
	}
	return days
}
func Severity(days int) string {
	switch {
	case days > 60:
		return "CRITICAL"
	case days >= 31:
		return "HIGH"
	case days >= 8:
		return "MEDIUM"
	default:
		return "LOW"
	}
}
