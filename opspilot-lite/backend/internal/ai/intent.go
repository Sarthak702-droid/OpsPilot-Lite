package ai

import "strings"

func DeterministicIntent(question string) string {
	q := strings.ToLower(question)
	switch {
	case strings.Contains(q, "what needs my attention") || strings.Contains(q, "priorit"):
		return "priorities"
	case strings.Contains(q, "which products") || strings.Contains(q, "stockout") || strings.Contains(q, "run out"):
		return "inventory"
	case strings.Contains(q, "which customers") || strings.Contains(q, "overdue invoice"):
		return "receivables"
	default:
		return "reasoning"
	}
}
