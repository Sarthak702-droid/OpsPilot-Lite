package payments

import (
	"testing"
	"time"
)

func TestSeverityBoundaries(t *testing.T) {
	cases := []struct {
		days int
		want string
	}{{0, "LOW"}, {7, "LOW"}, {8, "MEDIUM"}, {30, "MEDIUM"}, {31, "HIGH"}, {60, "HIGH"}, {61, "CRITICAL"}}
	for _, x := range cases {
		if got := Severity(x.days); got != x.want {
			t.Errorf("%d days: got %s want %s", x.days, got, x.want)
		}
	}
}
func TestDaysOverdue(t *testing.T) {
	due := time.Date(2026, 9, 1, 0, 0, 0, 0, time.UTC)
	now := time.Date(2026, 9, 25, 12, 0, 0, 0, time.UTC)
	if got := DaysOverdue(due, now); got != 24 {
		t.Fatalf("got %d", got)
	}
}
