package server

import (
	"fmt"
	"net/http"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

type httpMetric struct {
	method string
	route  string
	status int
	count  uint64
	nanos  uint64
}

var httpMetrics = struct {
	sync.Mutex
	items map[string]*httpMetric
}{items: make(map[string]*httpMetric)}

func recordHTTPMetric(method, route string, status int, elapsed time.Duration) {
	if route == "" {
		route = "unmatched"
	}
	key := fmt.Sprintf("%s\x00%s\x00%d", method, route, status)
	httpMetrics.Lock()
	defer httpMetrics.Unlock()
	item := httpMetrics.items[key]
	if item == nil {
		item = &httpMetric{method: method, route: route, status: status}
		httpMetrics.items[key] = item
	}
	item.count++
	item.nanos += uint64(elapsed.Nanoseconds())
}

func metrics(c *gin.Context) {
	if c.Request.Method != http.MethodGet {
		c.Status(http.StatusMethodNotAllowed)
		return
	}
	httpMetrics.Lock()
	items := make([]httpMetric, 0, len(httpMetrics.items))
	for _, item := range httpMetrics.items {
		items = append(items, *item)
	}
	httpMetrics.Unlock()
	sort.Slice(items, func(i, j int) bool {
		return items[i].method+items[i].route+fmt.Sprint(items[i].status) < items[j].method+items[j].route+fmt.Sprint(items[j].status)
	})
	var body strings.Builder
	body.WriteString("# HELP opspilot_http_requests_total Total HTTP requests by method, route, and response status.\n# TYPE opspilot_http_requests_total counter\n")
	for _, item := range items {
		fmt.Fprintf(&body, "opspilot_http_requests_total{method=%q,route=%q,status=%q} %d\n", item.method, item.route, fmt.Sprint(item.status), item.count)
	}
	body.WriteString("# HELP opspilot_http_request_duration_seconds_sum Total HTTP request duration in seconds.\n# TYPE opspilot_http_request_duration_seconds_sum counter\n")
	for _, item := range items {
		fmt.Fprintf(&body, "opspilot_http_request_duration_seconds_sum{method=%q,route=%q,status=%q} %.9f\n", item.method, item.route, fmt.Sprint(item.status), float64(item.nanos)/float64(time.Second))
	}
	c.Data(http.StatusOK, "text/plain; version=0.0.4; charset=utf-8", []byte(body.String()))
}
