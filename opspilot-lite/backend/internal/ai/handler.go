package ai

import (
	"context"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/auth"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/common"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/inventory"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/signals"
	"io"
	"net/http"
	"time"
)

type Handler struct {
	Client    Client
	Signals   signals.Repository
	Inventory inventory.Service
	Repo      Repository
}

func (h Handler) Ask(c *gin.Context) {
	var req AskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Error(c, 422, "VALIDATION_ERROR", "Question must be 3 to 1000 characters")
		return
	}
	id, _ := auth.Current(c)
	items, err := h.Signals.List(c.Request.Context(), id.OrganizationID)
	if err != nil {
		common.Error(c, 500, "DATABASE_ERROR", "Could not load evidence")
		return
	}
	intent := DeterministicIntent(req.Question)
	if intent != "reasoning" {
		answer := deterministicAnswer(intent, items)
		c.JSON(200, AskResponse{Source: "deterministic", Answer: answer, Evidence: signalEvidence(filterSignals(intent, items)), AIAvailable: false})
		return
	}
	contextJSON, evidence, err := BuildContext(req.Question, items)
	if err != nil {
		common.Error(c, 500, "CONTEXT_ERROR", "Could not build context")
		return
	}
	if len(evidence) == 0 {
		c.JSON(200, AskResponse{Source: "deterministic", Answer: "No active signals have enough evidence for a recommendation.", Evidence: []string{}, AIAvailable: false})
		return
	}
	result, err := h.Client.Complete(c.Request.Context(), string(contextJSON))
	if err != nil {
		c.JSON(200, AskResponse{Source: "fallback", Answer: "AI reasoning temporarily unavailable. Review the current signals below.", Evidence: evidence, AIAvailable: false})
		return
	}
	rec, err := Validate(result, evidence)
	if err != nil {
		c.JSON(200, AskResponse{Source: "fallback", Answer: "AI output could not be validated. Review the current signals below.", Evidence: evidence, AIAvailable: false})
		return
	}
	if rec.RecommendedAction == "CREATE_PURCHASE_ORDER" {
		grounded := false
		inventoryItems, loadErr := h.Inventory.List(c.Request.Context(), id.OrganizationID)
		if loadErr == nil {
			for _, signal := range items {
				if signal.Type != "STOCKOUT_RISK" {
					continue
				}
				cited := false
				for _, item := range rec.Evidence {
					if item == signal.Title+": "+signal.Description {
						cited = true
						break
					}
				}
				if !cited {
					continue
				}
				for _, item := range inventoryItems {
					if item.ID == signal.EntityID && item.Metrics.RecommendedOrderQuantity > 0 {
						quantity := item.Metrics.RecommendedOrderQuantity
						rec.RecommendedQuantity = &quantity
						grounded = true
						break
					}
				}
				if grounded {
					break
				}
			}
		}
		if !grounded {
			c.JSON(200, AskResponse{Source: "fallback", Answer: "The proposed order quantity could not be verified against inventory. Review the current signals below.", Evidence: evidence, AIAvailable: false})
			return
		}
	} else {
		rec.RecommendedQuantity = nil
	}
	var linkedSignal signals.Signal
	for _, cited := range rec.Evidence {
		for _, signal := range items {
			if cited == signal.Title+": "+signal.Description {
				linkedSignal = signal
				break
			}
		}
		if linkedSignal.ID != uuid.Nil {
			break
		}
	}
	if linkedSignal.ID == uuid.Nil {
		c.JSON(200, AskResponse{Source: "fallback", Answer: "Recommendation evidence could not be linked to an active signal.", Evidence: evidence, AIAvailable: false})
		return
	}
	recommendationID, saveErr := h.Repo.Save(c.Request.Context(), id.OrganizationID, id.UserID, linkedSignal.ID, h.Client.Model, c.ClientIP(), rec)
	if saveErr != nil {
		common.Error(c, 500, "DATABASE_ERROR", "Could not record recommendation")
		return
	}
	c.JSON(200, AskResponse{Source: "mimo", Recommendation: &rec, RecommendationID: &recommendationID, Evidence: rec.Evidence, AIAvailable: true})
}
func (h Handler) Recommendations(c *gin.Context) {
	id, _ := auth.Current(c)
	items, err := h.Repo.List(c.Request.Context(), id.OrganizationID)
	if err != nil {
		common.Error(c, 500, "DATABASE_ERROR", "Could not load recommendations")
		return
	}
	c.JSON(200, gin.H{"items": items})
}
func filterSignals(intent string, items []signals.Signal) []signals.Signal {
	out := make([]signals.Signal, 0)
	for _, item := range items {
		if intent == "inventory" && item.Type != "STOCKOUT_RISK" && item.Type != "OVERSTOCK" {
			continue
		}
		if intent == "receivables" && item.Type != "PAYMENT_OVERDUE" && item.Type != "HIGH_VALUE_PAYMENT_PENDING" {
			continue
		}
		out = append(out, item)
	}
	return out
}
func deterministicAnswer(intent string, items []signals.Signal) string {
	if len(items) == 0 {
		return "No active operational risks were found in the latest signal refresh."
	}
	switch intent {
	case "inventory":
		return "Current inventory risks are listed in the evidence below."
	case "receivables":
		return "Current overdue receivables are listed in the evidence below."
	default:
		return "Current priorities are listed in the evidence below."
	}
}
func signalEvidence(items []signals.Signal) []string {
	out := make([]string, 0, 10)
	for _, s := range items {
		if len(out) >= 10 {
			break
		}
		out = append(out, s.Title+": "+s.Description)
	}
	return out
}
func (h Handler) Health(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
	defer cancel()
	c.JSON(200, gin.H{"available": h.Client.Healthy(ctx)})
}
func (h Handler) Stream(c *gin.Context) {
	var req AskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.Error(c, 422, "VALIDATION_ERROR", "Invalid question")
		return
	}
	id, _ := auth.Current(c)
	if DeterministicIntent(req.Question) != "reasoning" {
		common.Error(c, http.StatusUnprocessableEntity, "DETERMINISTIC_ANSWER", "This question is answered directly through /api/ai/ask")
		return
	}
	items, err := h.Signals.List(c.Request.Context(), id.OrganizationID)
	if err != nil {
		common.Error(c, 500, "DATABASE_ERROR", "Could not load evidence")
		return
	}
	payload, evidence, err := BuildContext(req.Question, items)
	if err != nil {
		common.Error(c, 500, "CONTEXT_ERROR", "Could not build context")
		return
	}
	if len(evidence) == 0 {
		common.Error(c, http.StatusUnprocessableEntity, "NO_EVIDENCE", "No active business evidence is available for reasoning")
		return
	}
	resp, err := h.Client.Stream(c.Request.Context(), string(payload))
	if err != nil {
		common.Error(c, 503, "AI_UNAVAILABLE", "AI reasoning temporarily unavailable")
		return
	}
	defer resp.Body.Close()
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("X-Accel-Buffering", "no")
	c.Status(http.StatusOK)
	limited := io.LimitReader(resp.Body, 2<<20)
	buf := make([]byte, 4096)
	for {
		n, readErr := limited.Read(buf)
		if n > 0 {
			if _, writeErr := c.Writer.Write(buf[:n]); writeErr != nil {
				return
			}
			c.Writer.Flush()
		}
		if readErr != nil {
			return
		}
	}
}
