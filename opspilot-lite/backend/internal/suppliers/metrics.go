package suppliers

type Metrics struct {
	Orders           int     `json:"orders"`
	Delivered        int     `json:"delivered"`
	Late             int     `json:"late"`
	OnTimeRate       float64 `json:"on_time_rate"`
	AverageDelayDays float64 `json:"average_delay_days"`
}

func Reliability(delivered, late int) string {
	if delivered < 3 {
		return "INSUFFICIENT_DATA"
	}
	rate := float64(delivered-late) / float64(delivered)
	if rate < 0.6 {
		return "HIGH"
	}
	if rate < 0.8 {
		return "MEDIUM"
	}
	return "LOW"
}
