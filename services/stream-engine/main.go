package main

import (
	"log"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/wavestack/stream-engine/internal/api"
	"github.com/wavestack/stream-engine/internal/ws"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "3400"
	}

	app := fiber.New(fiber.Config{
		AppName: "WaveStack Stream Engine v1.0",
	})

	app.Use(logger.New())

	// Health
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})

	// REST API routes
	api.Register(app)

	// WebSocket hub for desktop app connections
	hub := ws.NewHub()
	go hub.Run()
	ws.Register(app, hub)

	log.Printf("[stream-engine] listening on :%s", port)
	if err := app.Listen(":" + port); err != nil {
		log.Fatal(err)
	}
}
