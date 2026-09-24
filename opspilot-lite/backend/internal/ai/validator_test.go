package ai

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"testing"
	"time"
)

func TestRejectInventedEvidence(t *testing.T) {
	raw := `{"priority":"HIGH","category":"INVENTORY","title":"Reorder","reason":"Low coverage","evidence":["Made up amount: 90000"],"recommended_action":"CREATE_PURCHASE_ORDER","recommended_quantity":100,"requires_approval":true}`
	if _, err := Validate(raw, []string{"Tile X21: 4 days of stock"}); err == nil {
		t.Fatal("invented evidence accepted")
	}
}
func TestValidRecommendation(t *testing.T) {
	e := "Tile X21: 4 days of stock"
	raw := `{"priority":"HIGH","category":"INVENTORY","title":"Reorder","reason":"Low coverage","evidence":["Tile X21: 4 days of stock"],"recommended_action":"CREATE_PURCHASE_ORDER","recommended_quantity":100,"requires_approval":true}`
	if _, err := Validate(raw, []string{e}); err != nil {
		t.Fatal(err)
	}
}
func TestClientCallsChatCompletions(t *testing.T) {
	var gotPath, gotModel string
	client := NewClient("http://mimo.test", "XiaomiMiMo/MiMo-V2.6-Pro-RL", "", time.Second)
	client.HTTP.Transport = transportFunc(func(r *http.Request) (*http.Response, error) {
		gotPath = r.URL.Path
		var body struct {
			Model string `json:"model"`
		}
		_ = json.NewDecoder(r.Body).Decode(&body)
		gotModel = body.Model
		return &http.Response{StatusCode: 200, Body: io.NopCloser(strings.NewReader(`{"choices":[{"message":{"content":"ok"}}]}`)), Header: http.Header{}}, nil
	})
	out, err := client.Complete(context.Background(), "evidence")
	if err != nil || out != "ok" || gotPath != "/v1/chat/completions" || gotModel != "XiaomiMiMo/MiMo-V2.6-Pro-RL" {
		t.Fatalf("response=%q path=%q model=%q err=%v", out, gotPath, gotModel, err)
	}
}
func TestClientDoesNotRetryInvalidRequest(t *testing.T) {
	attempts := 0
	client := NewClient("http://mimo.test", "model", "", time.Second)
	client.HTTP.Transport = transportFunc(func(r *http.Request) (*http.Response, error) {
		attempts++
		return &http.Response{StatusCode: 400, Body: io.NopCloser(strings.NewReader("invalid")), Header: http.Header{}}, nil
	})
	_, err := client.Complete(context.Background(), "evidence")
	if err == nil || attempts != 1 {
		t.Fatalf("err=%v attempts=%d", err, attempts)
	}
}
func TestClientRetriesUnavailable(t *testing.T) {
	attempts := 0
	client := NewClient("http://mimo.test", "model", "", 5*time.Second)
	client.HTTP.Transport = transportFunc(func(r *http.Request) (*http.Response, error) {
		attempts++
		if attempts < 3 {
			return &http.Response{StatusCode: 503, Body: io.NopCloser(strings.NewReader("unavailable")), Header: http.Header{}}, nil
		}
		return &http.Response{StatusCode: 200, Body: io.NopCloser(strings.NewReader(`{"choices":[{"message":{"content":"recovered"}}]}`)), Header: http.Header{}}, nil
	})
	result, err := client.Complete(context.Background(), "evidence")
	if err != nil || result != "recovered" || attempts != 3 {
		t.Fatalf("result=%q err=%v attempts=%d", result, err, attempts)
	}
}
func TestStreamUsesStreamingFlag(t *testing.T) {
	streaming := false
	client := NewClient("http://mimo.test", "model", "", time.Second)
	client.HTTP.Transport = transportFunc(func(r *http.Request) (*http.Response, error) {
		var body struct {
			Stream bool `json:"stream"`
		}
		_ = json.NewDecoder(r.Body).Decode(&body)
		streaming = body.Stream
		return &http.Response{StatusCode: 200, Body: io.NopCloser(strings.NewReader("data: {\"choices\":[]}\n\ndata: [DONE]\n\n")), Header: http.Header{}}, nil
	})
	response, err := client.Stream(context.Background(), "evidence")
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()
	data, _ := io.ReadAll(response.Body)
	if !streaming || !strings.Contains(string(data), "[DONE]") {
		t.Fatalf("stream=%v data=%q", streaming, data)
	}
}

type transportFunc func(*http.Request) (*http.Response, error)

func (f transportFunc) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }
