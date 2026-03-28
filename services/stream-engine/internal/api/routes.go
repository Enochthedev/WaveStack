// Package api — REST endpoints for stream-engine.
// Handles stream event ingestion, clip commands, and stream session management.
package api

import (
	"os"

	"github.com/gofiber/fiber/v2"
)

func internalOnly(c *fiber.Ctx) error {
	secret := os.Getenv("INTERNAL_SERVICE_SECRET")
	if secret == "" {
		secret = "dev-internal-secret"
	}
	if c.Get("x-internal-service") != secret {
		return c.Status(403).JSON(fiber.Map{"error": "Forbidden"})
	}
	return c.Next()
}

// Register mounts all API routes on the given Fiber app.
func Register(app *fiber.App) {
	v1 := app.Group("/v1")

	// ── Stream events ─────────────────────────────────────────────────────────
	// POST /v1/events — ingest a stream signal from the desktop app
	v1.Post("/events", internalOnly, ingestEvent)

	// POST /v1/commands/:orgId — send a command to a connected desktop app
	v1.Post("/commands/:orgId", internalOnly, sendCommand)

	// GET /v1/sessions — active stream sessions
	v1.Get("/sessions", internalOnly, listSessions)

	// POST /v1/sessions/:id/clip — trigger a clip
	v1.Post("/sessions/:id/clip", internalOnly, triggerClip)
}
