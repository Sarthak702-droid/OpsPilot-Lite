package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
)

type Client struct {
	BaseURL, Model, APIKey string
	HTTP                   *http.Client
}
type message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}
type completionRequest struct {
	Model    string    `json:"model"`
	Messages []message `json:"messages"`
	Stream   bool      `json:"stream"`
}
type completionResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
}

func NewClient(base, model, key string, timeout time.Duration) Client {
	return Client{BaseURL: strings.TrimRight(base, "/"), Model: model, APIKey: key, HTTP: &http.Client{Timeout: timeout}}
}
func (c Client) request(ctx context.Context, evidence string, stream bool) (*http.Response, error) {
	return c.requestWithSystem(ctx, SystemPrompt, evidence, stream)
}
func (c Client) requestWithSystem(ctx context.Context, system, evidence string, stream bool) (*http.Response, error) {
	body, err := json.Marshal(completionRequest{Model: c.Model, Messages: []message{{"system", system}, {"user", evidence}}, Stream: stream})
	if err != nil {
		return nil, err
	}
	for attempt := 0; attempt < 3; attempt++ {
		req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.BaseURL+"/v1/chat/completions", bytes.NewReader(body))
		if err != nil {
			return nil, err
		}
		req.Header.Set("Content-Type", "application/json")
		if c.APIKey != "" {
			req.Header.Set("Authorization", "Bearer "+c.APIKey)
		}
		resp, err := c.HTTP.Do(req)
		if err == nil && resp.StatusCode == 200 {
			return resp, nil
		}
		transient := err != nil
		if resp != nil {
			transient = resp.StatusCode == 429 || resp.StatusCode == 502 || resp.StatusCode == 503 || resp.StatusCode == 504
			io.Copy(io.Discard, io.LimitReader(resp.Body, 1024))
			resp.Body.Close()
		}
		if !transient || attempt == 2 {
			if err != nil {
				return nil, err
			}
			return nil, fmt.Errorf("inference status %d", resp.StatusCode)
		}
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-time.After(time.Duration(1<<attempt) * time.Second):
		}
	}
	return nil, errors.New("inference unavailable")
}
func (c Client) Complete(ctx context.Context, evidence string) (string, error) {
	return c.CompleteWithSystem(ctx, SystemPrompt, evidence)
}
func (c Client) CompleteWithSystem(ctx context.Context, system, evidence string) (string, error) {
	ctx, span := otel.Tracer("opspilot/ai").Start(ctx, "mimo.chat.completion")
	defer span.End()
	span.SetAttributes(attribute.String("ai.model", c.Model), attribute.Int("ai.prompt_size_bytes", len(system)+len(evidence)))
	resp, err := c.requestWithSystem(ctx, system, evidence, false)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "inference failed")
		return "", err
	}
	defer resp.Body.Close()
	var out completionResponse
	if err := json.NewDecoder(io.LimitReader(resp.Body, 1<<20)).Decode(&out); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "invalid inference response")
		return "", err
	}
	if len(out.Choices) == 0 {
		return "", errors.New("empty completion")
	}
	span.SetAttributes(attribute.Int("ai.output_size_bytes", len(out.Choices[0].Message.Content)))
	return out.Choices[0].Message.Content, nil
}
func (c Client) Stream(ctx context.Context, evidence string) (*http.Response, error) {
	return c.request(ctx, evidence, true)
}
func (c Client) Healthy(ctx context.Context) bool {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.BaseURL+"/v1/models", nil)
	if err != nil {
		return false
	}
	if c.APIKey != "" {
		req.Header.Set("Authorization", "Bearer "+c.APIKey)
	}
	resp, err := c.HTTP.Do(req)
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	return resp.StatusCode == 200
}
