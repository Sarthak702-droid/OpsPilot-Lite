package main

import (
	"context"
	"flag"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/cache"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/config"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/database"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/inventory"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/observability"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/scheduler"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/signals"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/suppliers"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"
)

func main() {
	once := flag.Bool("once", false, "run one signal refresh and exit")
	flag.Parse()
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	cfg := config.Load()
	shutdownTracing, err := observability.InitTracingFor(ctx, "opspilot-worker")
	if err != nil {
		log.Fatal(err)
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
	engine := signals.Engine{DB: db, Repository: signals.Repository{DB: db}, Inventory: inventory.Service{DB: db}, Suppliers: suppliers.Service{DB: db}}
	runner := scheduler.Runner{DB: db, Redis: redis, Engine: engine}
	if *once {
		if err := runner.Run(ctx); err != nil {
			log.Fatal(err)
		}
		return
	}
	ticker := time.NewTicker(15 * time.Minute)
	defer ticker.Stop()
	for {
		runCtx, cancel := context.WithTimeout(ctx, 10*time.Minute)
		if err := runner.Run(runCtx); err != nil {
			log.Printf("signal refresh: %v", err)
		}
		cancel()
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
	}
}
