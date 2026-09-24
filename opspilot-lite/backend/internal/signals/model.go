package signals

import (
	"github.com/google/uuid"
	"time"
)

type Signal struct {
	ID          uuid.UUID `json:"id"`
	Type        string    `json:"signal_type"`
	EntityType  string    `json:"entity_type"`
	EntityID    uuid.UUID `json:"entity_id"`
	Severity    string    `json:"severity"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	MetricName  string    `json:"metric_name"`
	MetricValue *float64  `json:"metric_value"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
}
