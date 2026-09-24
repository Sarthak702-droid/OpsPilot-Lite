FROM golang:1.25-alpine AS build
WORKDIR /src
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ ./
RUN CGO_ENABLED=0 go build -o /api ./cmd/api
RUN CGO_ENABLED=0 go build -o /worker ./cmd/worker
RUN CGO_ENABLED=0 go build -o /migrate ./cmd/migrate
FROM alpine:3.21
RUN apk add --no-cache poppler-utils ca-certificates
WORKDIR /app
COPY --from=build /api /api
COPY --from=build /worker /worker
COPY --from=build /migrate /migrate
COPY --from=build /src/migrations ./migrations
EXPOSE 8080
CMD ["/api"]
