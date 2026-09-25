package auth

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"math/big"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func TestVerifierChecksAuthorizedParty(t *testing.T) {
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{"keys": []any{map[string]any{
			"kid": "test", "kty": "RSA", "use": "sig",
			"n": base64.RawURLEncoding.EncodeToString(key.PublicKey.N.Bytes()),
			"e": base64.RawURLEncoding.EncodeToString(big.NewInt(int64(key.PublicKey.E)).Bytes()),
		}}})
	}))
	defer server.Close()
	verifier := NewVerifier(server.URL, "https://clerk.example.test", "http://localhost:3000")
	for _, test := range []struct {
		party string
		valid bool
	}{
		{"http://localhost:3000", true},
		{"https://other.example.test", false},
	} {
		token := jwt.NewWithClaims(jwt.SigningMethodRS256, sessionClaims{
			RegisteredClaims: jwt.RegisteredClaims{Issuer: verifier.Issuer, Subject: "user_test", ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Minute))},
			AuthorizedParty:  test.party,
		})
		token.Header["kid"] = "test"
		raw, err := token.SignedString(key)
		if err != nil {
			t.Fatal(err)
		}
		_, err = verifier.Subject(context.Background(), raw)
		if (err == nil) != test.valid {
			t.Fatalf("party %q: verification error = %v", test.party, err)
		}
	}
}
