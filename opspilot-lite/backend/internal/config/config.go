package config

import (
	"encoding/base64"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Env, Port, DatabaseURL, RedisURL, FrontendOrigin            string
	ClerkJWKSURL, ClerkIssuer                                   string
	MimoBaseURL, MimoModel, MimoAPIKey                          string
	MimoTimeout                                                 time.Duration
	R2AccountID, R2AccessKey, R2SecretKey, R2Bucket, R2Endpoint string
	SMTPHost, SMTPPort, SMTPUser, SMTPPassword, SMTPFrom        string
}

func Load() Config {
	seconds, err := strconv.Atoi(value("MIMO_TIMEOUT_SECONDS", "120"))
	if err != nil || seconds < 1 {
		seconds = 120
	}
	issuer := os.Getenv("CLERK_ISSUER")
	if issuer == "" {
		issuer = clerkIssuer(os.Getenv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"))
	}
	jwksURL := os.Getenv("CLERK_JWKS_URL")
	if jwksURL == "" && issuer != "" {
		jwksURL = issuer + "/.well-known/jwks.json"
	}
	return Config{
		Env: value("APP_ENV", "development"), Port: value("PORT", "8080"),
		DatabaseURL: value("DATABASE_URL", "postgres://opspilot:opspilot@localhost:15432/opspilot?sslmode=disable"),
		RedisURL:    value("REDIS_URL", "redis://localhost:16379/0"), FrontendOrigin: value("FRONTEND_ORIGIN", "http://localhost:3000"),
		ClerkJWKSURL: jwksURL, ClerkIssuer: issuer,
		MimoBaseURL: value("MIMO_BASE_URL", "http://localhost:30000"),
		MimoModel:   value("MIMO_MODEL", "XiaomiMiMo/MiMo-V2.6-Pro-RL"),
		MimoAPIKey:  os.Getenv("MIMO_API_KEY"), MimoTimeout: time.Duration(seconds) * time.Second,
		R2AccountID: os.Getenv("R2_ACCOUNT_ID"), R2AccessKey: os.Getenv("R2_ACCESS_KEY"), R2SecretKey: os.Getenv("R2_SECRET_KEY"), R2Bucket: os.Getenv("R2_BUCKET"), R2Endpoint: os.Getenv("R2_ENDPOINT"),
		SMTPHost: os.Getenv("SMTP_HOST"), SMTPPort: value("SMTP_PORT", "587"), SMTPUser: os.Getenv("SMTP_USER"), SMTPPassword: os.Getenv("SMTP_PASSWORD"), SMTPFrom: os.Getenv("SMTP_FROM"),
	}
}

func clerkIssuer(key string) string {
	encoded := strings.TrimPrefix(strings.TrimPrefix(key, "pk_test_"), "pk_live_")
	if encoded == key || encoded == "" {
		return ""
	}
	decoded, err := base64.RawStdEncoding.DecodeString(strings.TrimRight(encoded, "="))
	if err != nil {
		return ""
	}
	host := strings.SplitN(string(decoded), "$", 2)[0]
	if len(host) > 253 || !regexp.MustCompile(`^[A-Za-z0-9.-]+$`).MatchString(host) || strings.Contains(host, "..") || !strings.Contains(host, ".") {
		return ""
	}
	return "https://" + host
}

func value(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
