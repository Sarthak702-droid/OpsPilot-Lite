package auth

import (
	"context"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/golang-jwt/jwt/v5"
	"io"
	"math/big"
	"net/http"
	"strings"
	"sync"
	"time"
)

type jwk struct {
	KID string `json:"kid"`
	KTY string `json:"kty"`
	N   string `json:"n"`
	E   string `json:"e"`
	Use string `json:"use"`
}
type jwks struct {
	Keys []jwk `json:"keys"`
}
type Verifier struct {
	URL, Issuer string
	Client      *http.Client
	mu          sync.RWMutex
	keys        map[string]*rsa.PublicKey
	fetched     time.Time
}

func NewVerifier(url, issuer string) *Verifier {
	return &Verifier{URL: url, Issuer: issuer, Client: &http.Client{Timeout: 5 * time.Second}}
}

func (v *Verifier) Subject(ctx context.Context, raw string) (string, error) {
	if v.URL == "" || v.Issuer == "" {
		return "", errors.New("Clerk verification is not configured")
	}
	claims := jwt.RegisteredClaims{}
	token, err := jwt.ParseWithClaims(raw, &claims, func(t *jwt.Token) (any, error) {
		if t.Method.Alg() != "RS256" {
			return nil, errors.New("unexpected signing algorithm")
		}
		kid, ok := t.Header["kid"].(string)
		if !ok || kid == "" {
			return nil, errors.New("missing key id")
		}
		return v.key(ctx, kid)
	}, jwt.WithIssuer(v.Issuer), jwt.WithExpirationRequired(), jwt.WithValidMethods([]string{"RS256"}), jwt.WithLeeway(30*time.Second))
	if err != nil || !token.Valid || claims.Subject == "" {
		return "", fmt.Errorf("invalid Clerk session: %w", err)
	}
	return claims.Subject, nil
}

func (v *Verifier) key(ctx context.Context, kid string) (*rsa.PublicKey, error) {
	v.mu.RLock()
	key := v.keys[kid]
	fresh := time.Since(v.fetched) < time.Hour
	v.mu.RUnlock()
	if key != nil && fresh {
		return key, nil
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, v.URL, nil)
	if err != nil {
		return nil, err
	}
	resp, err := v.Client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("JWKS status %d", resp.StatusCode)
	}
	var document jwks
	if err := json.NewDecoder(io.LimitReader(resp.Body, 1<<20)).Decode(&document); err != nil {
		return nil, err
	}
	keys := make(map[string]*rsa.PublicKey)
	for _, j := range document.Keys {
		if j.KTY != "RSA" || j.KID == "" || (j.Use != "" && j.Use != "sig") {
			continue
		}
		n, err := base64.RawURLEncoding.DecodeString(j.N)
		if err != nil {
			continue
		}
		e, err := base64.RawURLEncoding.DecodeString(j.E)
		if err != nil {
			continue
		}
		exp := new(big.Int).SetBytes(e).Int64()
		if exp < 3 || exp > 1<<31-1 {
			continue
		}
		keys[j.KID] = &rsa.PublicKey{N: new(big.Int).SetBytes(n), E: int(exp)}
	}
	v.mu.Lock()
	v.keys = keys
	v.fetched = time.Now()
	v.mu.Unlock()
	key = keys[kid]
	if key == nil {
		return nil, errors.New("unknown signing key")
	}
	return key, nil
}

func Bearer(header string) string {
	parts := strings.SplitN(header, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return ""
	}
	return strings.TrimSpace(parts[1])
}
