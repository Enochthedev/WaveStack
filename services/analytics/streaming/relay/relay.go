// Package relay manages FFmpeg-based RTMP rebroadcast.
//
// It receives a single RTMP ingest (from MediaMTX — either local desktop or
// cloud) and fans it out to multiple platform RTMP endpoints using one FFmpeg
// process per target. Each process does -c copy (no re-encode) so CPU usage
// is negligible — it's pure muxing/forwarding.
package relay

import (
	"context"
	"fmt"
	"log"
	"os/exec"
	"sync"
	"time"
)

// ── Platform RTMP ingest templates ──────────────────────────────────────────

// PlatformIngest maps platform IDs to their RTMP ingest base URLs.
// The stream key is appended by the caller.
var PlatformIngest = map[string]string{
	"twitch":  "rtmp://live.twitch.tv/app/",
	"youtube": "rtmp://a.rtmp.youtube.com/live2/",
	"kick":    "rtmp://fa723fc1b171.global-contribute.live-video.net/app/",
	"facebook": "rtmps://live-api-s.facebook.com:443/rtmp/",
	"tiktok":  "rtmp://push.rtmp.tiktok.com/live/",
}

// ── Types ───────────────────────────────────────────────────────────────────

// TargetStatus describes the state of a single rebroadcast target.
type TargetStatus string

const (
	StatusStarting TargetStatus = "starting"
	StatusActive   TargetStatus = "active"
	StatusFailed   TargetStatus = "failed"
	StatusStopped  TargetStatus = "stopped"
)

// Target represents one outbound RTMP feed.
type Target struct {
	Platform  string       `json:"platform"`
	IngestURL string       `json:"ingest_url"` // full RTMP URL including stream key
	Status    TargetStatus `json:"status"`
	StartedAt *time.Time   `json:"started_at,omitempty"`
	Error     string       `json:"error,omitempty"`

	cancel context.CancelFunc `json:"-"`
	cmd    *exec.Cmd          `json:"-"`
}

// Session holds all rebroadcast state for a single org's stream.
type Session struct {
	OrgID     string    `json:"org_id"`
	SourceURL string    `json:"source_url"` // e.g. rtmp://localhost:1935/live/wavestack
	Targets   []*Target `json:"targets"`
	CreatedAt time.Time `json:"created_at"`

	mu sync.Mutex `json:"-"`
}

// Manager tracks active rebroadcast sessions by orgId.
type Manager struct {
	mu       sync.RWMutex
	sessions map[string]*Session
	ffmpeg   string // path to ffmpeg binary
}

// NewManager creates a relay manager. It looks up ffmpeg in PATH.
func NewManager() *Manager {
	bin := "ffmpeg"
	if p, err := exec.LookPath("ffmpeg"); err == nil {
		bin = p
	}
	return &Manager{
		sessions: make(map[string]*Session),
		ffmpeg:   bin,
	}
}

// ── Public API ──────────────────────────────────────────────────────────────

// StartRequest is the payload for starting a rebroadcast session.
type StartRequest struct {
	OrgID     string           `json:"org_id"`
	SourceURL string           `json:"source_url"` // RTMP source (MediaMTX output)
	Targets   []TargetRequest  `json:"targets"`
}

// TargetRequest describes one platform to relay to.
type TargetRequest struct {
	Platform  string `json:"platform"`
	StreamKey string `json:"stream_key"`
}

// Start begins rebroadcasting a source to multiple platforms.
func (m *Manager) Start(req StartRequest) (*Session, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Stop existing session for this org if any
	if existing, ok := m.sessions[req.OrgID]; ok {
		existing.stopAll()
	}

	sess := &Session{
		OrgID:     req.OrgID,
		SourceURL: req.SourceURL,
		CreatedAt: time.Now(),
	}

	for _, t := range req.Targets {
		baseURL, ok := PlatformIngest[t.Platform]
		if !ok {
			// Allow custom RTMP URLs — treat platform as label, stream key as full URL
			baseURL = ""
		}

		ingestURL := baseURL + t.StreamKey
		if baseURL == "" {
			// If platform not in map, the stream key IS the full URL
			ingestURL = t.StreamKey
		}

		target := &Target{
			Platform:  t.Platform,
			IngestURL: ingestURL,
			Status:    StatusStarting,
		}
		sess.Targets = append(sess.Targets, target)
	}

	m.sessions[req.OrgID] = sess

	// Launch FFmpeg processes in parallel
	for _, target := range sess.Targets {
		go m.launchFFmpeg(sess, target)
	}

	return sess, nil
}

// Stop ends all rebroadcast targets for an org.
func (m *Manager) Stop(orgID string) error {
	m.mu.Lock()
	sess, ok := m.sessions[orgID]
	if !ok {
		m.mu.Unlock()
		return fmt.Errorf("no active rebroadcast for org %s", orgID)
	}
	delete(m.sessions, orgID)
	m.mu.Unlock()

	sess.stopAll()
	return nil
}

// StopTarget stops a single platform target within an org's session.
func (m *Manager) StopTarget(orgID, platform string) error {
	m.mu.RLock()
	sess, ok := m.sessions[orgID]
	m.mu.RUnlock()
	if !ok {
		return fmt.Errorf("no active rebroadcast for org %s", orgID)
	}

	sess.mu.Lock()
	defer sess.mu.Unlock()

	for _, t := range sess.Targets {
		if t.Platform == platform {
			if t.cancel != nil {
				t.cancel()
			}
			t.Status = StatusStopped
			return nil
		}
	}
	return fmt.Errorf("target %s not found", platform)
}

// Status returns the current session for an org, or nil.
func (m *Manager) Status(orgID string) *Session {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.sessions[orgID]
}

// ActiveSessions returns all active rebroadcast sessions.
func (m *Manager) ActiveSessions() []*Session {
	m.mu.RLock()
	defer m.mu.RUnlock()
	result := make([]*Session, 0, len(m.sessions))
	for _, s := range m.sessions {
		result = append(result, s)
	}
	return result
}

// ── Internal ────────────────────────────────────────────────────────────────

// launchFFmpeg starts a single FFmpeg process to relay source → target.
// Uses -c copy (stream copy) so there's no re-encoding overhead.
func (m *Manager) launchFFmpeg(sess *Session, target *Target) {
	ctx, cancel := context.WithCancel(context.Background())
	target.cancel = cancel

	// FFmpeg command: read RTMP source, copy codec, push to target RTMP
	// -re: read input at native frame rate (prevent buffer overrun)
	// -rw_timeout: 5s connect/read timeout
	// -f flv: output format for RTMP
	args := []string{
		"-hide_banner",
		"-loglevel", "warning",
		"-rw_timeout", "5000000", // 5s in microseconds
		"-i", sess.SourceURL,
		"-c", "copy",
		"-f", "flv",
		"-flvflags", "no_duration_filesize",
		target.IngestURL,
	}

	cmd := exec.CommandContext(ctx, m.ffmpeg, args...)
	target.cmd = cmd

	now := time.Now()
	target.StartedAt = &now

	log.Printf("[relay] starting ffmpeg for org=%s platform=%s → %s",
		sess.OrgID, target.Platform, maskKey(target.IngestURL))

	if err := cmd.Start(); err != nil {
		target.Status = StatusFailed
		target.Error = err.Error()
		log.Printf("[relay] ffmpeg start failed org=%s platform=%s: %v", sess.OrgID, target.Platform, err)
		return
	}

	target.Status = StatusActive
	log.Printf("[relay] ffmpeg active org=%s platform=%s pid=%d", sess.OrgID, target.Platform, cmd.Process.Pid)

	// Wait for process to finish (blocks until done or cancelled)
	if err := cmd.Wait(); err != nil {
		if ctx.Err() == context.Canceled {
			target.Status = StatusStopped
			log.Printf("[relay] ffmpeg stopped org=%s platform=%s (cancelled)", sess.OrgID, target.Platform)
		} else {
			target.Status = StatusFailed
			target.Error = err.Error()
			log.Printf("[relay] ffmpeg exited org=%s platform=%s: %v", sess.OrgID, target.Platform, err)
		}
	} else {
		// Clean exit (source ended)
		target.Status = StatusStopped
		log.Printf("[relay] ffmpeg finished org=%s platform=%s (source ended)", sess.OrgID, target.Platform)
	}
}

// stopAll cancels all targets in a session.
func (s *Session) stopAll() {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, t := range s.Targets {
		if t.cancel != nil {
			t.cancel()
		}
		t.Status = StatusStopped
	}
}

// maskKey hides the stream key portion of an RTMP URL for logging.
func maskKey(url string) string {
	if len(url) <= 30 {
		return url[:len(url)/2] + "***"
	}
	return url[:30] + "***"
}
