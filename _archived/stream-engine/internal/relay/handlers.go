package relay

import (
	"github.com/gofiber/fiber/v2"
)

// RegisterRoutes mounts rebroadcast REST endpoints under /v1/relay.
func RegisterRoutes(app fiber.Router, mgr *Manager) {
	r := app.Group("/relay")

	// POST /v1/relay/start — start rebroadcasting to platforms
	r.Post("/start", func(c *fiber.Ctx) error {
		var req StartRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "invalid body"})
		}
		if req.OrgID == "" {
			return c.Status(400).JSON(fiber.Map{"error": "org_id required"})
		}
		if req.SourceURL == "" {
			return c.Status(400).JSON(fiber.Map{"error": "source_url required"})
		}
		if len(req.Targets) == 0 {
			return c.Status(400).JSON(fiber.Map{"error": "at least one target required"})
		}

		sess, err := mgr.Start(req)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		return c.Status(201).JSON(sess)
	})

	// POST /v1/relay/stop — stop all rebroadcast for an org
	r.Post("/stop", func(c *fiber.Ctx) error {
		var body struct {
			OrgID string `json:"org_id"`
		}
		if err := c.BodyParser(&body); err != nil || body.OrgID == "" {
			return c.Status(400).JSON(fiber.Map{"error": "org_id required"})
		}
		if err := mgr.Stop(body.OrgID); err != nil {
			return c.Status(404).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(fiber.Map{"ok": true})
	})

	// POST /v1/relay/stop-target — stop a single platform target
	r.Post("/stop-target", func(c *fiber.Ctx) error {
		var body struct {
			OrgID    string `json:"org_id"`
			Platform string `json:"platform"`
		}
		if err := c.BodyParser(&body); err != nil || body.OrgID == "" || body.Platform == "" {
			return c.Status(400).JSON(fiber.Map{"error": "org_id and platform required"})
		}
		if err := mgr.StopTarget(body.OrgID, body.Platform); err != nil {
			return c.Status(404).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(fiber.Map{"ok": true})
	})

	// GET /v1/relay/status/:orgId — get rebroadcast status
	r.Get("/status/:orgId", func(c *fiber.Ctx) error {
		orgID := c.Params("orgId")
		sess := mgr.Status(orgID)
		if sess == nil {
			return c.JSON(fiber.Map{"active": false, "targets": []any{}})
		}
		return c.JSON(fiber.Map{
			"active":     true,
			"org_id":     sess.OrgID,
			"source_url": sess.SourceURL,
			"targets":    sess.Targets,
			"created_at": sess.CreatedAt,
		})
	})

	// GET /v1/relay/sessions — list all active rebroadcast sessions
	r.Get("/sessions", func(c *fiber.Ctx) error {
		return c.JSON(mgr.ActiveSessions())
	})

	// GET /v1/relay/platforms — list known platform ingest URLs
	r.Get("/platforms", func(c *fiber.Ctx) error {
		platforms := make([]fiber.Map, 0, len(PlatformIngest))
		for id, url := range PlatformIngest {
			platforms = append(platforms, fiber.Map{
				"platform":   id,
				"ingest_url": url,
			})
		}
		return c.JSON(platforms)
	})
}
