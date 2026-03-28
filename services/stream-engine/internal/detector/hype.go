// Package detector — real-time hype moment detection.
// Combines audio RMS, chat rate, and viewer delta into a single hype score.
package detector

import "math"

// HypeWeights controls the contribution of each signal to the hype score.
var HypeWeights = struct {
	AudioRMS    float64
	ChatRate    float64
	ViewerDelta float64
}{
	AudioRMS:    0.35,
	ChatRate:    0.40,
	ViewerDelta: 0.25,
}

// Normalisation bounds (tune these with real data)
const (
	maxAudioRMS    = 0.9  // full loudness
	maxChatRate    = 50.0 // messages/sec
	maxViewerDelta = 100.0 // viewers gained/lost per interval
)

func clamp(v, min, max float64) float64 {
	if v < min {
		return min
	}
	if v > max {
		return max
	}
	return v
}

// ComputeHypeScore returns a score between 0.0 and 1.0.
func ComputeHypeScore(data map[string]float64) float64 {
	audioRMS := clamp(data["audio_rms"], 0, maxAudioRMS) / maxAudioRMS
	chatRate := clamp(data["chat_rate"], 0, maxChatRate) / maxChatRate
	viewerDelta := math.Abs(clamp(data["viewer_delta"], -maxViewerDelta, maxViewerDelta)) / maxViewerDelta

	score := HypeWeights.AudioRMS*audioRMS +
		HypeWeights.ChatRate*chatRate +
		HypeWeights.ViewerDelta*viewerDelta

	return math.Round(score*100) / 100
}
