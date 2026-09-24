package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"
)

func main() {
	scenario := os.Getenv("SCENARIO")
	if scenario == "" {
		scenario = "valid"
	}
	mux := http.NewServeMux()
	mux.HandleFunc("/v1/models", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprint(w, `{"data":[{"id":"XiaomiMiMo/MiMo-V2.6-Pro-RL"}]}`)
	})
	mux.HandleFunc("/v1/chat/completions", func(w http.ResponseWriter, r *http.Request) {
		var input struct {
			Stream bool `json:"stream"`
		}
		if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20)).Decode(&input); err != nil {
			http.Error(w, "invalid request", 400)
			return
		}
		switch scenario {
		case "timeout":
			select {
			case <-r.Context().Done():
				return
			case <-time.After(3 * time.Minute):
				return
			}
		case "500":
			http.Error(w, "mock failure", 500)
			return
		case "503":
			http.Error(w, "mock unavailable", 503)
			return
		case "stream":
			w.Header().Set("Content-Type", "text/event-stream")
			fmt.Fprint(w, "data: {\"choices\":[{\"delta\":{\"content\":\"Risk\"}}]}\n\n")
			w.(http.Flusher).Flush()
			fmt.Fprint(w, "data: [DONE]\n\n")
			return
		}
		content := `{"priority":"HIGH","category":"INVENTORY","title":"Tile X21 may stock out","reason":"Stock coverage is below lead time.","evidence":["Tile X21 may stock out: 4.0 days of stock versus 6.0 days supplier lead time"],"recommended_action":"CREATE_PURCHASE_ORDER","recommended_quantity":999,"requires_approval":true}`
		if scenario == "invalid" {
			content = `not json`
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{"choices": []any{map[string]any{"message": map[string]any{"content": content}}}})
	})
	log.Printf("mock SGLang scenario=%s addr=127.0.0.1:30000", scenario)
	log.Fatal(http.ListenAndServe("127.0.0.1:30000", mux))
}
