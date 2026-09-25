package cache

import (
	"context"
	"github.com/redis/go-redis/v9"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"net"
)

type redisTracing struct{}

func (redisTracing) DialHook(next redis.DialHook) redis.DialHook {
	return func(ctx context.Context, network, addr string) (net.Conn, error) { return next(ctx, network, addr) }
}
func (redisTracing) ProcessHook(next redis.ProcessHook) redis.ProcessHook {
	return func(ctx context.Context, cmd redis.Cmder) error {
		ctx, span := otel.Tracer("opspilot/redis").Start(ctx, "redis."+cmd.Name())
		defer span.End()
		span.SetAttributes(attribute.String("db.system.name", "redis"))
		err := next(ctx, cmd)
		if err != nil && err != redis.Nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, "redis failed")
		}
		return err
	}
}
func (redisTracing) ProcessPipelineHook(next redis.ProcessPipelineHook) redis.ProcessPipelineHook {
	return func(ctx context.Context, cmds []redis.Cmder) error {
		ctx, span := otel.Tracer("opspilot/redis").Start(ctx, "redis.pipeline")
		defer span.End()
		span.SetAttributes(attribute.Int("redis.command_count", len(cmds)))
		err := next(ctx, cmds)
		if err != nil && err != redis.Nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, "redis pipeline failed")
		}
		return err
	}
}
