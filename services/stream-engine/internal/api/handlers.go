package api

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/wavestack/stream-engine/internal/detector"
)

// In-memory store for active sessions (replace with Redis in production)
var (
	sessionsMu sync.RWMutex
	sessions   = map[string]*StreamSession{}
)

type StreamSession struct {
	ID        string    `json:"id"`
	OrgID     string    `json:"org_id"`
	Platform  string    `json:"platform"`
	Status    string    `json:"status"`
	StartedAt time.Time `json:"started_at"`
	HypeScore float64   `json:"hype_score"`
	ChatRate  float64   `json:"chat_rate"`
	AudioRMS  float64   `json:"audio_rms"`
}

type StreamEvent struct {
	SessionID string             `json:"session_id"`
	OrgID     string             `json:"org_id"`
	EventType string             `json:"event_type"`
	Timestamp time.Time          `json:"timestamp"`
	Data      map[string]float64 `json:"data"`
}

func ingestEvent(c *fiber.Ctx) error {
	var evt StreamEvent
	if err := c.BodyParser(&evt); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid body"})
	}
	if evt.SessionID == "" || evt.OrgID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "session_id and org_id required"})
	}
	evt.Timestamp = time.Now()

	// Update session state
	sessionsMu.Lock()
	sess, ok := sessions[evt.SessionID]
	if !ok {
		sess = &StreamSession{ID: evt.SessionID, OrgID: evt.OrgID, Status: "live", StartedAt: time.Now()}
		sessions[evt.SessionID] = sess
	}
	if v, ok := evt.Data["audio_rms"]; ok {
		sess.AudioRMS = v
	}
	if v, ok := evt.Data["chat_rate"]; ok {
		sess.ChatRate = v
	}
	sessionsMu.Unlock()

	// Run hype detection
	hypeScore := detector.ComputeHypeScore(evt.Data)
	if hypeScore > 0.75 {
		log.Printf("[stream-engine] HYPE DETECTED session=%s score=%.2f", evt.SessionID, hypeScore)
		// TODO: publish to Redis pub/sub for agent-orchestrator to pick up
	}

	return c.Status(201).JSON(fiber.Map{
		"ok":         true,
		"hype_score": hypeScore,
	})
}

func sendCommand(c *fiber.Ctx) error {
	orgID := c.Params("orgId")
	// Command payload is forwarded as-is to the desktop app via WebSocket
	// The hub is not available here yet — in production, publish to Redis
	// and the ws goroutine picks it up.
	log.Printf("[stream-engine] command for org=%s body=%s", orgID, string(c.Body()))
	return c.JSON(fiber.Map{"ok": true, "org_id": orgID})
}

func listSessions(c *fiber.Ctx) error {
	sessionsMu.RLock()
	defer sessionsMu.RUnlock()

	result := make([]*StreamSession, 0, len(sessions))
	for _, s := range sessions {
		result = append(result, s)
	}
	return c.JSON(result)
}

func triggerClip(c *fiber.Ctx) error {
	sessionID := c.Params("id")
	var body struct {
		Start    int `json:"start"`
		Duration int `json:"duration"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid body"})
	}
	if body.Duration == 0 {
		body.Duration = 30
	}
	if body.Start == 0 {
		body.Start = -30
	}

	cmd := map[string]interface{}{
		"action":   "create_clip",
		"start":    body.Start,
		"duration": body.Duration,
	}
	cmdBytes, _ := json.Marshal(cmd)

	sessionsMu.RLock()
	sess, ok := sessions[sessionID]
	sessionsMu.RUnlock()

	if !ok {
		return c.Status(404).JSON(fiber.Map{"error": "session not found"})
	}

	log.Printf("[stream-engine] clip trigger org=%s session=%s cmd=%s", sess.OrgID, sessionID, cmdBytes)
	return c.JSON(fiber.Map{"ok": true, "command": cmd})
}
