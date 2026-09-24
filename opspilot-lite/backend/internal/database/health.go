package database

import (
	"context"
	"github.com/jackc/pgx/v5/pgxpool"
	"time"
)

func Healthy(ctx context.Context, pool *pgxpool.Pool) bool {
	check, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	return pool.Ping(check) == nil
}
