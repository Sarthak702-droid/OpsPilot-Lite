package scheduler

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/cache"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/dashboard"
	"github.com/opspilot-lite/opspilot-lite/backend/internal/signals"
	"github.com/redis/go-redis/v9"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
)

type Runner struct {
	DB     *pgxpool.Pool
	Redis  *redis.Client
	Engine signals.Engine
}

func (r Runner) Run(ctx context.Context) error {
	ctx, span := otel.Tracer("opspilot/worker").Start(ctx, "signals.refresh")
	defer span.End()
	token := uuid.NewString()
	acquired, err := r.Redis.SetNX(ctx, "scheduler:signal-refresh", token, 12*time.Minute).Result()
	if err != nil {
		span.RecordError(err)
		return err
	}
	if !acquired {
		span.SetAttributes(attribute.Bool("scheduler.skipped_locked", true))
		return nil
	}
	defer func() {
		releaseCtx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		_ = r.Redis.Eval(releaseCtx, `if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end`, []string{"scheduler:signal-refresh"}, token).Err()
	}()
	if err := r.Engine.Run(ctx); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "signal refresh failed")
		return err
	}
	rows, err := r.DB.Query(ctx, `SELECT id FROM organizations`)
	if err != nil {
		return err
	}
	orgs := make([]uuid.UUID, 0)
	for rows.Next() {
		var org uuid.UUID
		if err := rows.Scan(&org); err != nil {
			rows.Close()
			return err
		}
		orgs = append(orgs, org)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return err
	}
	service := dashboard.Service{DB: r.DB, Redis: r.Redis, Signals: signals.Repository{DB: r.DB}}
	for _, org := range orgs {
		if err := r.Redis.Del(ctx, cache.DashboardKey(org)).Err(); err != nil {
			return err
		}
		if _, err := service.Get(ctx, org); err != nil {
			return err
		}
	}
	span.SetAttributes(attribute.Int("scheduler.organizations", len(orgs)))
	return nil
}
