package main

import (
	"context"
	"flag"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/config"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/database"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/inventory"
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
	db, err := database.Connect(ctx, config.Load().DatabaseURL)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()
	engine := signals.Engine{DB: db, Repository: signals.Repository{DB: db}, Inventory: inventory.Service{DB: db}, Suppliers: suppliers.Service{DB: db}}
	if *once {
		if err := engine.Run(ctx); err != nil {
			log.Fatal(err)
		}
		return
	}
	ticker := time.NewTicker(15 * time.Minute)
	defer ticker.Stop()
	for {
		runCtx, cancel := context.WithTimeout(ctx, 10*time.Minute)
		if err := engine.Run(runCtx); err != nil {
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
