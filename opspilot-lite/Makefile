.PHONY: dev frontend backend db-up db-down migrate seed test lint build sglang-test
export GOCACHE ?= /tmp/opspilot-go-build
export GOMODCACHE ?= /tmp/opspilot-go-mod
dev:
	./scripts/dev.sh
frontend:
	cd frontend && npm run dev
backend:
	cd backend && go run ./cmd/api
db-up:
	docker compose up -d postgres redis
db-down:
	docker compose down
migrate:
	./scripts/migrate.sh
seed:
	./scripts/seed.sh
test:
	./scripts/test.sh
lint:
	./scripts/lint.sh
build:
	cd backend && go build ./cmd/api ./cmd/worker ./cmd/migrate
	cd frontend && npm run build
sglang-test:
	./infrastructure/sglang/test-endpoint.sh
