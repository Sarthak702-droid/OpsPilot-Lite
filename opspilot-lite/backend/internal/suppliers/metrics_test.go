package suppliers

import "testing"

func TestReliability(t *testing.T) {
	if Reliability(5, 3) != "HIGH" {
		t.Fatal("three of five late must be high")
	}
	if Reliability(2, 1) != "INSUFFICIENT_DATA" {
		t.Fatal("small samples must be marked insufficient")
	}
}
