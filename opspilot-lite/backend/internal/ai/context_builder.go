package ai

import (
	"encoding/json"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/signals"
)

func BuildContext(question string, items []signals.Signal) ([]byte, []string, error) {
	stringsOut := make([]string, 0, 10)
	for i, s := range items {
		if i >= 10 {
			break
		}
		stringsOut = append(stringsOut, s.Title+": "+s.Description)
	}
	b, err := json.Marshal(struct {
		Question string   `json:"question"`
		Evidence []string `json:"evidence"`
	}{question, stringsOut})
	return b, stringsOut, err
}
