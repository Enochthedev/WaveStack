package ws

import (
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"
)

// Register attaches the WebSocket route to the Fiber app.
func Register(app *fiber.App, hub *Hub) {
	// Upgrade middleware
	app.Use("/ws", func(c *fiber.Ctx) error {
		if websocket.IsWebSocketUpgrade(c) {
			c.Locals("hub", hub)
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	})

	app.Get("/ws", websocket.New(func(conn *websocket.Conn) {
		orgID := conn.Query("org_id", "")
		if orgID == "" {
			conn.Close()
			return
		}

		client := &Client{
			conn:  conn,
			send:  make(chan []byte, 64),
			OrgID: orgID,
			hub:   hub,
		}
		hub.register <- client

		go client.writePump()
		client.readPump() // blocks until disconnected
	}))
}
