package ai

import (
	"encoding/json"
	"errors"
	"io"
	"strings"
)

func Validate(raw string, allowed []string) (Recommendation, error) {
	var r Recommendation
	dec := json.NewDecoder(strings.NewReader(raw))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&r); err != nil {
		return r, err
	}
	var extra any
	if err := dec.Decode(&extra); err != io.EOF {
		return r, errors.New("trailing JSON")
	}
	if !oneOf(r.Priority, "LOW", "MEDIUM", "HIGH", "CRITICAL") || !oneOf(r.Category, "INVENTORY", "RECEIVABLES", "SUPPLIER", "GENERAL") || !oneOf(r.RecommendedAction, "INTERNAL_ALERT", "FOLLOW_UP", "CREATE_PURCHASE_ORDER", "NONE") {
		return r, errors.New("invalid recommendation enum")
	}
	if strings.TrimSpace(r.Title) == "" || strings.TrimSpace(r.Reason) == "" || len(r.Title) > 160 || len(r.Reason) > 2000 {
		return r, errors.New("invalid recommendation text")
	}
	if len(r.Evidence) == 0 || len(r.Evidence) > 10 {
		return r, errors.New("invalid evidence count")
	}
	for _, e := range r.Evidence {
		found := false
		for _, a := range allowed {
			if e == a {
				found = true
				break
			}
		}
		if !found {
			return r, errors.New("evidence not in supplied context")
		}
	}
	if r.RecommendedQuantity != nil && (*r.RecommendedQuantity < 0 || *r.RecommendedQuantity > 1000000) {
		return r, errors.New("invalid quantity")
	}
	if r.RecommendedAction == "CREATE_PURCHASE_ORDER" && !r.RequiresApproval {
		return r, errors.New("purchase order requires approval")
	}
	return r, nil
}
func oneOf(v string, allowed ...string) bool {
	for _, a := range allowed {
		if v == a {
			return true
		}
	}
	return false
}
