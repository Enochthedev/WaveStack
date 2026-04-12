// Package ws — WebSocket hub for bidirectional communication between
// the cloud (stream-engine) and desktop app instances.
package ws

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/gofiber/websocket/v2"
)

const (
	writeWait  = 10 * time.Second
	pongWait   = 60 * time.Second
	pingPeriod = (pongWait * 9) / 10
)

// Message is a typed WebSocket message.
type Message struct {
	Type    string          `json:"type"`
	OrgID   string          `json:"org_id"`
	Payload json.RawMessage `json:"payload"`
}

// Client represents a connected desktop app.
type Client struct {
	conn  *websocket.Conn
	send  chan []byte
	OrgID string
	hub   *Hub
}

func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case msg, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				return
			}
		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, msg, err := c.conn.ReadMessage()
		if err != nil {
			break
		}
		c.hub.inbound <- inboundMsg{client: c, data: msg}
	}
}

type inboundMsg struct {
	client *Client
	data   []byte
}

// Hub manages all connected desktop clients.
type Hub struct {
	clients    map[*Client]bool
	byOrg      map[string][]*Client
	broadcast  chan []byte
	inbound    chan inboundMsg
	register   chan *Client
	unregister chan *Client
	mu         sync.RWMutex

	// Event handlers registered by API layer
	handlers map[string]func(msg Message, client *Client)
}

func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		byOrg:      make(map[string][]*Client),
		broadcast:  make(chan []byte, 256),
		inbound:    make(chan inboundMsg, 256),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		handlers:   make(map[string]func(Message, *Client)),
	}
}

// On registers a handler for a message type.
func (h *Hub) On(msgType string, handler func(Message, *Client)) {
	h.handlers[msgType] = handler
}

// SendToOrg sends a message to all desktop clients for an org.
func (h *Hub) SendToOrg(orgID string, msg Message) {
	data, err := json.Marshal(msg)
	if err != nil {
		return
	}
	h.mu.RLock()
	clients := h.byOrg[orgID]
	h.mu.RUnlock()

	for _, c := range clients {
		select {
		case c.send <- data:
		default:
			log.Printf("[ws] dropping message to slow client org=%s", orgID)
		}
	}
}

func (h *Hub) Run() {
	for {
		select {
		case c := <-h.register:
			h.mu.Lock()
			h.clients[c] = true
			h.byOrg[c.OrgID] = append(h.byOrg[c.OrgID], c)
			h.mu.Unlock()
			log.Printf("[ws] desktop connected org=%s total=%d", c.OrgID, len(h.clients))

		case c := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[c]; ok {
				delete(h.clients, c)
				clients := h.byOrg[c.OrgID]
				for i, cc := range clients {
					if cc == c {
						h.byOrg[c.OrgID] = append(clients[:i], clients[i+1:]...)
						break
					}
				}
				close(c.send)
			}
			h.mu.Unlock()
			log.Printf("[ws] desktop disconnected org=%s", c.OrgID)

		case raw := <-h.inbound:
			var msg Message
			if err := json.Unmarshal(raw.data, &msg); err != nil {
				continue
			}
			if handler, ok := h.handlers[msg.Type]; ok {
				go handler(msg, raw.client)
			}
		}
	}
}
