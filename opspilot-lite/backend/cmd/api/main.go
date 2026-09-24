package main

import (
	"context"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/cache"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/config"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/database"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/observability"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/server"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

func main() {
	cfg := config.Load()
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	shutdownTracing, err := observability.InitTracing(ctx)
	if err != nil {
		log.Fatalf("initialize tracing: %v", err)
	}
	defer func() {
		shutdown, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = shutdownTracing(shutdown)
	}()
	db, err := database.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()
	redis, err := cache.Connect(ctx, cfg.RedisURL)
	if err != nil {
		log.Fatal(err)
	}
	defer redis.Close()
	srv := &http.Server{Addr: ":" + cfg.Port, Handler: server.New(cfg, db, redis), ReadHeaderTimeout: 5 * time.Second, IdleTimeout: 60 * time.Second}
	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal(err)
		}
	}()
	<-ctx.Done()
	shutdown, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = srv.Shutdown(shutdown)
}
