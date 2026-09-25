package config

import (
	"encoding/base64"
	"testing"
)

func TestClerkIssuerFromPublishableKey(t *testing.T) {
	key := "pk_test_" + base64.RawStdEncoding.EncodeToString([]byte("example.clerk.accounts.dev$"))
	if got := clerkIssuer(key); got != "https://example.clerk.accounts.dev" {
		t.Fatalf("issuer = %q", got)
	}
	for _, key := range []string{"", "pk_test_bad", "pk_test_" + base64.RawStdEncoding.EncodeToString([]byte("evil.example/path$"))} {
		if got := clerkIssuer(key); got != "" {
			t.Fatalf("invalid key accepted: %q", got)
		}
	}
}

func TestConfigLoad(t *testing.T) {
	cfg := Load()
	if cfg.Port != "18080" {
		t.Fatalf("expected Port 18080, got %q", cfg.Port)
	}
	if cfg.ClerkJWKSURL == "" {
		t.Fatal("expected ClerkJWKSURL to be populated by auto-loaded .env")
	}
	if cfg.ClerkIssuer == "" {
		t.Fatal("expected ClerkIssuer to be populated by auto-loaded .env")
	}
}

