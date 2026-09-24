package main

import (
	"context"
	"fmt"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/config"
	"log"
	"os"
	"sort"
	"strings"
)

func main() {
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, config.Load().DatabaseURL)
	if err != nil {
		log.Fatal(err)
	}
	defer pool.Close()
	if _, err = pool.Exec(ctx, `CREATE TABLE IF NOT EXISTS schema_migrations (name text primary key, applied_at timestamptz not null default now())`); err != nil {
		log.Fatal(err)
	}
	files, err := os.ReadDir("migrations")
	if err != nil {
		log.Fatal(err)
	}
	names := make([]string, 0, len(files))
	for _, f := range files {
		if strings.HasSuffix(f.Name(), ".up.sql") {
			names = append(names, f.Name())
		}
	}
	sort.Strings(names)
	for _, name := range names {
		var exists bool
		if err := pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE name=$1)`, name).Scan(&exists); err != nil {
			log.Fatal(err)
		}
		if exists {
			continue
		}
		body, err := os.ReadFile("migrations/" + name)
		if err != nil {
			log.Fatal(err)
		}
		tx, err := pool.Begin(ctx)
		if err != nil {
			log.Fatal(err)
		}
		if _, err = tx.Exec(ctx, string(body)); err == nil {
			_, err = tx.Exec(ctx, `INSERT INTO schema_migrations(name) VALUES($1)`, name)
		}
		if err == nil {
			err = tx.Commit(ctx)
		} else {
			_ = tx.Rollback(ctx)
		}
		if err != nil {
			log.Fatal(fmt.Errorf("migration %s: %w", name, err))
		}
		fmt.Fprintln(os.Stdout, "applied", name)
	}
}
