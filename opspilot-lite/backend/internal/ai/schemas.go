package ai

import "github.com/google/uuid"

type Recommendation struct {
	Priority            string   `json:"priority"`
	Category            string   `json:"category"`
	Title               string   `json:"title"`
	Reason              string   `json:"reason"`
	Evidence            []string `json:"evidence"`
	RecommendedAction   string   `json:"recommended_action"`
	RecommendedQuantity *float64 `json:"recommended_quantity,omitempty"`
	RequiresApproval    bool     `json:"requires_approval"`
}
type AskRequest struct {
	Question string `json:"question" binding:"required,min=3,max=1000"`
}
type AskResponse struct {
	Source           string          `json:"source"`
	Answer           string          `json:"answer,omitempty"`
	Recommendation   *Recommendation `json:"recommendation,omitempty"`
	RecommendationID *uuid.UUID      `json:"recommendation_id,omitempty"`
	Evidence         []string        `json:"evidence"`
	AIAvailable      bool            `json:"ai_available"`
}
