package integration

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/config"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/server"
	"github.com/redis/go-redis/v9"
	"math/big"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"
)

func TestApproveAndExecuteDraftPurchaseOrder(t *testing.T) {
	dbURL, redisURL := os.Getenv("TEST_DATABASE_URL"), os.Getenv("TEST_REDIS_URL")
	if dbURL == "" || redisURL == "" {
		t.Skip("set TEST_DATABASE_URL and TEST_REDIS_URL")
	}
	gin.SetMode(gin.TestMode)
	ctx := context.Background()
	db, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	redisOptions, err := redis.ParseURL(redisURL)
	if err != nil {
		t.Fatal(err)
	}
	cache := redis.NewClient(redisOptions)
	defer cache.Close()
	org, user, supplier, product, action := uuid.New(), uuid.New(), uuid.New(), uuid.New(), uuid.New()
	subject := "clerk-test-" + user.String()
	if _, err := db.Exec(ctx, `INSERT INTO organizations(id,name) VALUES($1,'Action test')`, org); err != nil {
		t.Fatal(err)
	}
	defer func() {
		for _, table := range []string{"purchase_order_items", "purchase_orders", "audit_logs", "actions", "inventory_transactions", "products", "suppliers", "users", "organizations"} {
			column := "organization_id"
			if table == "organizations" {
				column = "id"
			}
			db.Exec(ctx, "DELETE FROM "+table+" WHERE "+column+"=$1", org)
		}
	}()
	if _, err := db.Exec(ctx, `INSERT INTO users(id,organization_id,clerk_user_id,role) VALUES($1,$2,$3,'OWNER')`, user, org, subject); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(ctx, `INSERT INTO suppliers(id,organization_id,name,average_lead_time_days) VALUES($1,$2,'Supplier',6)`, supplier, org); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(ctx, `INSERT INTO products(id,organization_id,sku,name,cost_price,current_stock,preferred_supplier_id) VALUES($1,$2,'SKU-PO','Tile',80,80,$3)`, product, org, supplier); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(ctx, `INSERT INTO inventory_transactions(organization_id,product_id,transaction_type,quantity,timestamp) VALUES($1,$2,'SALE',140,now())`, org, product); err != nil {
		t.Fatal(err)
	}
	payload, _ := json.Marshal(map[string]any{"product_id": product, "supplier_id": supplier, "quantity": 100, "reason": "stock below lead time"})
	if _, err := db.Exec(ctx, `INSERT INTO actions(id,organization_id,action_type,payload,risk_level,status) VALUES($1,$2,'CREATE_PURCHASE_ORDER',$3,'HIGH','AWAITING_APPROVAL')`, action, org, payload); err != nil {
		t.Fatal(err)
	}
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}
	jwks := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{"keys": []any{map[string]any{"kid": "test-key", "kty": "RSA", "use": "sig", "n": base64.RawURLEncoding.EncodeToString(key.PublicKey.N.Bytes()), "e": base64.RawURLEncoding.EncodeToString(big.NewInt(int64(key.PublicKey.E)).Bytes())}}})
	}))
	defer jwks.Close()
	issuer := "https://clerk.test"
	claims := jwt.RegisteredClaims{Issuer: issuer, Subject: subject, ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)), IssuedAt: jwt.NewNumericDate(time.Now())}
	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	token.Header["kid"] = "test-key"
	signed, err := token.SignedString(key)
	if err != nil {
		t.Fatal(err)
	}
	router := server.New(config.Config{ClerkJWKSURL: jwks.URL, ClerkIssuer: issuer, FrontendOrigin: "http://localhost:3000", MimoBaseURL: "http://mimo.test", MimoModel: "XiaomiMiMo/MiMo-V2.6-Pro-RL", MimoTimeout: time.Second}, db, cache)
	listRequest := httptest.NewRequest(http.MethodGet, "/api/actions", nil)
	listRequest.Header.Set("Authorization", "Bearer "+signed)
	listResponse := httptest.NewRecorder()
	router.ServeHTTP(listResponse, listRequest)
	if listResponse.Code != 200 {
		t.Fatalf("list actions status=%d body=%s", listResponse.Code, listResponse.Body.String())
	}
	var listed struct {
		Items []struct {
			ProductName  string `json:"product_name"`
			SupplierName string `json:"supplier_name"`
			Reason       string `json:"reason"`
		} `json:"items"`
	}
	if err := json.Unmarshal(listResponse.Body.Bytes(), &listed); err != nil {
		t.Fatal(err)
	}
	if len(listed.Items) != 1 || listed.Items[0].ProductName != "Tile" || listed.Items[0].SupplierName != "Supplier" || listed.Items[0].Reason != "stock below lead time" {
		t.Fatalf("unexpected action list: %+v", listed.Items)
	}
	for _, step := range []string{"approve", "execute"} {
		request := httptest.NewRequest(http.MethodPost, fmt.Sprintf("/api/actions/%s/%s", action, step), nil)
		request.Header.Set("Authorization", "Bearer "+signed)
		response := httptest.NewRecorder()
		router.ServeHTTP(response, request)
		if response.Code != 200 {
			t.Fatalf("%s status=%d body=%s", step, response.Code, response.Body.String())
		}
	}
	var status string
	var qty float64
	err = db.QueryRow(ctx, `SELECT a.status,i.quantity::float8 FROM actions a JOIN purchase_orders p ON p.organization_id=a.organization_id AND p.po_number=$2 JOIN purchase_order_items i ON i.organization_id=p.organization_id AND i.purchase_order_id=p.id WHERE a.organization_id=$1 AND a.id=$3`, org, "OP-"+action.String()[:8], action).Scan(&status, &qty)
	if err != nil {
		t.Fatal(err)
	}
	if status != "EXECUTED" || qty != 100 {
		t.Fatalf("status=%s quantity=%v", status, qty)
	}
	staleAction := uuid.New()
	if _, err := db.Exec(ctx, `INSERT INTO actions(id,organization_id,action_type,payload,risk_level,status) VALUES($1,$2,'CREATE_PURCHASE_ORDER',$3,'HIGH','AWAITING_APPROVAL')`, staleAction, org, payload); err != nil {
		t.Fatal(err)
	}
	approveRequest := httptest.NewRequest(http.MethodPost, fmt.Sprintf("/api/actions/%s/approve", staleAction), nil)
	approveRequest.Header.Set("Authorization", "Bearer "+signed)
	approveResponse := httptest.NewRecorder()
	router.ServeHTTP(approveResponse, approveRequest)
	if approveResponse.Code != 200 {
		t.Fatalf("approve stale setup: %d %s", approveResponse.Code, approveResponse.Body.String())
	}
	if _, err := db.Exec(ctx, `UPDATE products SET current_stock=300 WHERE organization_id=$1 AND id=$2`, org, product); err != nil {
		t.Fatal(err)
	}
	staleRequest := httptest.NewRequest(http.MethodPost, fmt.Sprintf("/api/actions/%s/execute", staleAction), nil)
	staleRequest.Header.Set("Authorization", "Bearer "+signed)
	staleResponse := httptest.NewRecorder()
	router.ServeHTTP(staleResponse, staleRequest)
	if staleResponse.Code != http.StatusConflict {
		t.Fatalf("stale action executed: %d %s", staleResponse.Code, staleResponse.Body.String())
	}
	var staleStatus string
	if err := db.QueryRow(ctx, `SELECT status FROM actions WHERE organization_id=$1 AND id=$2`, org, staleAction).Scan(&staleStatus); err != nil {
		t.Fatal(err)
	}
	if staleStatus != "FAILED" {
		t.Fatalf("stale action status=%s", staleStatus)
	}
	var failureAuditCount int
	if err := db.QueryRow(ctx, `SELECT count(*) FROM audit_logs WHERE organization_id=$1 AND resource_id=$2 AND action='ACTION_FAILED'`, org, staleAction).Scan(&failureAuditCount); err != nil {
		t.Fatal(err)
	}
	if failureAuditCount != 1 {
		t.Fatalf("stale action audit count=%d", failureAuditCount)
	}
}
