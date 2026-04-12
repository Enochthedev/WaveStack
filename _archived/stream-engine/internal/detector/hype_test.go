package detector

import (
	"testing"
)

func TestComputeHypeScore_Zero(t *testing.T) {
	score := ComputeHypeScore(map[string]float64{})
	if score != 0.0 {
		t.Errorf("expected 0.0, got %f", score)
	}
}

func TestComputeHypeScore_Max(t *testing.T) {
	score := ComputeHypeScore(map[string]float64{
		"audio_rms":    0.9,
		"chat_rate":    50.0,
		"viewer_delta": 100.0,
	})
	if score != 1.0 {
		t.Errorf("expected 1.0, got %f", score)
	}
}

func TestComputeHypeScore_Partial(t *testing.T) {
	// Only chat spike
	score := ComputeHypeScore(map[string]float64{
		"chat_rate": 25.0, // 50% of max
	})
	expected := HypeWeights.ChatRate * 0.5
	if score != expected {
		t.Errorf("expected %.2f, got %.2f", expected, score)
	}
}

func TestComputeHypeScore_Clamped(t *testing.T) {
	// Values above max should be clamped to 1.0 contribution
	score := ComputeHypeScore(map[string]float64{
		"audio_rms":    999.0,
		"chat_rate":    999.0,
		"viewer_delta": 999.0,
	})
	if score != 1.0 {
		t.Errorf("expected 1.0, got %f", score)
	}
}

func TestComputeHypeScore_NegativeViewerDelta(t *testing.T) {
	// Negative delta (people leaving) should still count for hype
	score := ComputeHypeScore(map[string]float64{
		"viewer_delta": -100.0,
	})
	expected := HypeWeights.ViewerDelta * 1.0
	if score != expected {
		t.Errorf("expected %.2f, got %.2f", expected, score)
	}
}
