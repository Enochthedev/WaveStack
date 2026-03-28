# WaveStack — QA Checklist

> Go through each section manually. Tick the box, note the result, flag anything broken.
> Automated test coverage is noted per section so you know what's already verified by CI.

---

## How to run automated tests first

```bash
# Python services
cd services/agent-orchestrator && python -m pytest tests/ -v   # 30 tests
cd services/auto-mod          && python -m pytest tests/ -v   # 17 tests

# TypeScript — core-app
cd apps/core-app && node_modules/.bin/vitest run               # 47 tests

# Go — stream-engine
cd services/stream-engine && go test ./...                     # 5 tests
```

Expected: **99 tests, all green**.

---

## 1. Auth

### 1.1 Login (Web)

| #   | Step                          | Expected                           | Pass? |
| --- | ----------------------------- | ---------------------------------- | ----- |
| 1   | Go to `http://localhost:3001` | Redirects to `/login`              |       |
| 2   | Submit empty form             | Shows validation error             |       |
| 3   | Submit wrong password         | Shows "Invalid credentials" error  |       |
| 4   | Submit correct credentials    | Redirects to `/dashboard`          |       |
| 5   | Refresh page while logged in  | Stays logged in (session persists) |       |
| 6   | Open new tab while logged in  | Shows dashboard, not login         |       |

### 1.2 Login (Mobile)

| #   | Step                            | Expected                               | Pass? |
| --- | ------------------------------- | -------------------------------------- | ----- |
| 1   | Open app cold (no stored token) | Shows login screen                     |       |
| 2   | Submit wrong password           | Shows inline error, no crash           |       |
| 3   | Submit correct credentials      | Navigates to Dashboard tab             |       |
| 4   | Force-quit and reopen app       | Auto-restores session (no re-login)    |       |
| 5   | Settings → Sign Out             | Returns to login screen, token cleared |       |

### 1.3 Token refresh

| #   | Step                                                               | Expected                         | Pass? |
| --- | ------------------------------------------------------------------ | -------------------------------- | ----- |
| 1   | Let access token expire (adjust `JWT_EXPIRY` to 1 min for testing) | Next API call silently refreshes |       |
| 2   | Revoke refresh token in DB                                         | User gets sent back to login     |       |

---

## 2. Dashboard (Web)

**Automated coverage:** `src/__tests__/approvals.test.ts`, `users.test.ts`

| #   | What to check                                 | Expected                                               | Pass? |
| --- | --------------------------------------------- | ------------------------------------------------------ | ----- |
| 1   | Load `/dashboard` with no active stream       | "Offline" status shown                                 |       |
| 2   | Load with an active stream                    | Viewer count + platform shown                          |       |
| 3   | Pending approvals badge in sidebar            | Shows count > 0 when approvals exist                   |       |
| 4   | "Approve" / "Reject" buttons on approval card | Toast fires, card disappears                           |       |
| 5   | Reject with no feedback                       | Allowed (feedback optional)                            |       |
| 6   | Page auto-refreshes approvals                 | New approval appears within 15 s without refresh       |       |
| 7   | Backend offline banner                        | Amber banner visible when API is down; mock data shown |       |

---

## 3. Agents Page (Web)

| #   | What to check                                        | Expected                                                                     | Pass? |
| --- | ---------------------------------------------------- | ---------------------------------------------------------------------------- | ----- |
| 1   | Load `/agents`                                       | Agent cards render (Clip, Content, Growth, Moderation, Community, Analytics) |       |
| 2   | Toggle agent enabled/disabled                        | Optimistic UI update; persists on refresh                                    |       |
| 3   | Change autonomy level (Manual → Copilot → Autopilot) | Dropdown updates; persists                                                   |       |
| 4   | Approval request list (Copilot mode)                 | Shows pending items, polling badge count                                     |       |
| 5   | Approve an item                                      | Card removed from list, toast "Approved"                                     |       |
| 6   | Reject with feedback                                 | Card removed, toast "Rejected"; feedback stored in DB as training signal     |       |
| 7   | Reject without feedback                              | Still works; no training signal created                                      |       |

---

## 4. Stream Page (Web)

| #   | What to check                        | Expected                                                        | Pass? |
| --- | ------------------------------------ | --------------------------------------------------------------- | ----- |
| 1   | Load `/stream` with no active stream | "Go Live" button visible                                        |       |
| 2   | Load with active stream              | "End Stream" button, viewer count, live badge                   |       |
| 3   | Click "Go Live"                      | API call → stream record created → page shows live state        |       |
| 4   | Click "End Stream"                   | API call → status changes to ended                              |       |
| 5   | RTMP Relay card (desktop app only)   | Card not visible in browser                                     |       |
| 6   | RTMP Relay card (Tauri desktop)      | Card visible; Start/Stop relay buttons work; RTMP URL displayed |       |

---

## 5. Approval Gate — End-to-End

This tests the full flow: Twitch bot → orchestrator → core-app → web/mobile.

**Prerequisites:** All services running locally via `docker compose up`.

| #   | Step                                                                      | Expected                                                                  | Pass? |
| --- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ----- |
| 1   | Set agent `clip` to autonomy level **Copilot** in the web UI              | Config saved                                                              |       |
| 2   | Send 3+ chat messages containing clip keywords in the Twitch channel      | Twitch bot logs: "Auto-clip approval request submitted"                   |       |
| 3   | Check orchestrator logs                                                   | `POST /v1/tasks/submit` 201 logged                                        |       |
| 4   | Check core-app logs                                                       | `POST /internal/tasks` 201, ApprovalRequest created                       |       |
| 5   | Check web dashboard                                                       | New approval card appears within 15 s                                     |       |
| 6   | Check mobile Approvals tab                                                | Same card appears                                                         |       |
| 7   | Approve in web UI                                                         | Orchestrator receives `POST /internal/approvals/:id`, clip agent executes |       |
| 8   | Approve in mobile                                                         | Same outcome                                                              |       |
| 9   | Reject with feedback                                                      | Feedback stored as training example in DB                                 |       |
| 10  | Reject with expired approval (wait 4 h or set `APPROVAL_TIMEOUT_HOURS=0`) | Core-app returns 409 CONFLICT "Approval expired"                          |       |
| 11  | Set clip agent to **Autopilot**                                           | No approval request created; clip runs directly                           |       |
| 12  | Orchestrator unreachable                                                  | Twitch bot falls back to direct clip, logs warning                        |       |

---

## 6. Twitch Bot

**Automated coverage:** none (integration-only)

| #   | What to check                                 | Expected                                                               | Pass? |
| --- | --------------------------------------------- | ---------------------------------------------------------------------- | ----- |
| 1   | Bot connects to Twitch                        | Log: "Connected to Twitch IRC"                                         |       |
| 2   | `!clip` command in chat                       | Clip created via Twitch API                                            |       |
| 3   | `!uptime` command                             | Bot replies with stream uptime                                         |       |
| 4   | 3+ users trigger clip keywords within 60 s    | Auto-clip flow triggered (see section 5)                               |       |
| 5   | Spam message                                  | Ignored / user warned (check auto-mod)                                 |       |
| 6   | Message classified as `command`               | Routed to command handler                                              |       |
| 7   | Message classified as `question_for_streamer` | Highlighted/logged separately                                          |       |
| 8   | Hype reporter active                          | `stream-engine:3400/v1/events` receives events every 5 s during stream |       |
| 9   | Auto-mod service down                         | Bot continues without classification; falls back to local heuristic    |       |

---

## 7. Discord Bot

| #   | What to check                             | Expected                                          | Pass? |
| --- | ----------------------------------------- | ------------------------------------------------- | ----- |
| 1   | Bot is online                             | Green status in server                            |       |
| 2   | `/clip` slash command                     | Creates Twitch clip, posts embed                  |       |
| 3   | `!ask what is WaveStack?`                 | RAG query → knowledge service → reply with answer |       |
| 4   | `?? how do I set up OBS?`                 | Same RAG flow                                     |       |
| 5   | `!q` prefix                               | Same RAG flow                                     |       |
| 6   | Knowledge service down                    | Bot replies "couldn't find an answer right now"   |       |
| 7   | Message with URL                          | Auto-mod flags as `spam_or_toxicity`; deleted     |       |
| 8   | Message with high toxicity score (> 0.95) | User banned                                       |       |
| 9   | Message with medium toxicity (0.75–0.95)  | User timed out                                    |       |
| 10  | Clean message                             | Passes through, no action                         |       |

---

## 8. Auto-Mod Service

**Automated coverage:** 17 tests in `services/auto-mod/tests/test_moderation.py` — all green.

| #   | What to check                                                                    | Expected                               | Pass? |
| --- | -------------------------------------------------------------------------------- | -------------------------------------- | ----- |
| 1   | `GET /health`                                                                    | `{"status":"ok"}`                      |       |
| 2   | `POST /api/v1/moderate/classify` — `{"text":"!clip"}`                            | `{"category":"command"}`               |       |
| 3   | `POST /api/v1/moderate/classify` — `{"text":"What game are you playing?"}`       | `{"category":"question_for_streamer"}` |       |
| 4   | `POST /api/v1/moderate/classify` — `{"text":"buy followers at http://spam.com"}` | `{"category":"spam_or_toxicity"}`      |       |
| 5   | `POST /api/v1/moderate/classify` — `{"text":"PogChamp"}`                         | `{"category":"community_chat"}`        |       |
| 6   | Send request without `text` field                                                | 422 Unprocessable Entity               |       |

**Quick curl test:**

```bash
curl -X POST http://localhost:8700/api/v1/moderate/classify \
  -H "Content-Type: application/json" \
  -d '{"text":"!clip"}'
# → {"category":"command","confidence":1.0,"method":"heuristic"}
```

---

## 9. Stream Engine

**Automated coverage:** 5 Go tests in `services/stream-engine/internal/detector/hype_test.go` — all green.

| #   | What to check                      | Expected                                            | Pass? |
| --- | ---------------------------------- | --------------------------------------------------- | ----- |
| 1   | `GET /health`                      | `{"status":"ok"}`                                   |       |
| 2   | `POST /v1/events` with metrics     | 200; hype score computed and broadcast              |       |
| 3   | `GET /v1/hype/current`             | Returns current hype score 0.0–1.0                  |       |
| 4   | WebSocket connect to `/ws`         | Receives hype events in real-time                   |       |
| 5   | Push metrics above threshold       | High hype event broadcast to WS subscribers         |       |
| 6   | Desktop app connects stream engine | `getStreamEngineStatus()` returns `connected: true` |       |

---

## 10. Desktop App (Tauri)

| #   | What to check                               | Expected                                                       | Pass? |
| --- | ------------------------------------------- | -------------------------------------------------------------- | ----- |
| 1   | App launches                                | Loads web UI in webview                                        |       |
| 2   | `isTauri` flag                              | `true` in desktop, `false` in browser                          |       |
| 3   | Stream page shows RTMP Relay card           | Only visible in desktop app                                    |       |
| 4   | Start Relay button                          | Mediamtx spawns; RTMP URL shown (`rtmp://localhost:1935/live`) |       |
| 5   | Stop Relay button                           | Mediamtx process killed                                        |       |
| 6   | OBS pointed at `rtmp://localhost:1935/live` | Stream passes through to Twitch                                |       |
| 7   | "Go Live" button in desktop                 | Starts relay + connects stream engine WS + calls API           |       |
| 8   | "End Stream" button                         | Ends API session + stops relay + disconnects WS                |       |
| 9   | Mediamtx crashes unexpectedly               | `mediamtx_status` returns `running: false`; UI shows error     |       |
| 10  | `getAppVersion()`                           | Returns version string from `tauri.conf.json`                  |       |

---

## 11. Mobile App (Expo)

| #   | What to check                    | Expected                                          | Pass? |
| --- | -------------------------------- | ------------------------------------------------- | ----- |
| 1   | App builds (`expo start`)        | No compile errors                                 |       |
| 2   | Login screen renders             | Email/password fields, Sign In button             |       |
| 3   | Successful login                 | Navigates to Dashboard tab                        |       |
| 4   | Dashboard — no stream            | "Offline" stat card                               |       |
| 5   | Dashboard — live stream          | Viewer count shown, live badge                    |       |
| 6   | Dashboard — pending approvals    | Count shown in stat card                          |       |
| 7   | Approvals tab — empty            | "All clear" empty state                           |       |
| 8   | Approvals tab — with items       | Cards render with urgency badge (red/amber/green) |       |
| 9   | Approve — tap Approve            | Alert confirm → card disappears                   |       |
| 10  | Reject — tap Reject              | Feedback modal slides up                          |       |
| 11  | Reject with feedback             | Feedback sent to API                              |       |
| 12  | Pull-to-refresh on any tab       | Data reloads                                      |       |
| 13  | Stream tab — live                | Green LIVE pill + viewer count                    |       |
| 14  | Brief tab — no tasks             | "Nothing scheduled yet" empty state               |       |
| 15  | Settings — user name/email shown | Matches logged-in account                         |       |
| 16  | Settings — Sign Out              | Returns to login                                  |       |
| 17  | Background polling               | Approvals badge updates without manual refresh    |       |

---

## 12. Skills Service

| #   | What to check                                            | Expected                                                                                                       | Pass? |
| --- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ----- |
| 1   | Run `pnpm db:seed` in `services/skills`                  | 5 skills created/updated: `clip-and-ship`, `stream-recap`, `stream-to-clips`, `vod-to-shorts`, `morning-brief` |       |
| 2   | Re-run seed                                              | Existing skills updated (upsert), no duplicates                                                                |       |
| 3   | Each skill has version `1.0.0` in `skill_versions` table | Verify via Prisma Studio                                                                                       |       |
| 4   | `clip-and-ship` definition has 4 steps                   | create_clip → generate_thumbnail → generate_caption → publish_clip                                             |       |
| 5   | `morning-brief` requires no mandatory inputs             | `inputSchema.required` is empty                                                                                |       |

---

## 13. API — Core Endpoints

**Automated coverage:** 47 vitest tests in `apps/core-app/src/__tests__/`.

Quick smoke tests (replace `TOKEN` and `ORG_ID`):

```bash
BASE=http://localhost:3000/api

# Auth
curl -X POST $BASE/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@wavestack.app","password":"password"}'

# Users
curl $BASE/v1/users/me \
  -H "Authorization: Bearer TOKEN" \
  -H "x-org-id: ORG_ID"

# Agents config
curl $BASE/v1/agents/config \
  -H "Authorization: Bearer TOKEN" \
  -H "x-org-id: ORG_ID"

# Pending approvals
curl $BASE/v1/agents/approvals \
  -H "Authorization: Bearer TOKEN" \
  -H "x-org-id: ORG_ID"

# Live stream
curl $BASE/v1/streams/live \
  -H "Authorization: Bearer TOKEN" \
  -H "x-org-id: ORG_ID"
```

| Endpoint                           | Method       | Expected status                          | Pass? |
| ---------------------------------- | ------------ | ---------------------------------------- | ----- |
| `/api/auth/login`                  | POST         | 200 with `token`, `refreshToken`, `user` |       |
| `/api/v1/users/me`                 | GET          | 200                                      |       |
| `/api/v1/agents/config`            | GET          | 200, array                               |       |
| `/api/v1/agents/approvals`         | GET          | 200, paginated                           |       |
| `/api/v1/agents/approvals/:id`     | POST approve | 200, status → approved                   |       |
| `/api/v1/agents/approvals/:id`     | POST reject  | 200, status → rejected                   |       |
| `/api/v1/streams/live`             | GET          | 200 or null                              |       |
| `/api/v1/queue`                    | GET          | 200, paginated                           |       |
| `/api/v1/platforms`                | GET          | 200, array                               |       |
| `/api/health`                      | GET          | 200 `{status:"ok"}`                      |       |
| Any endpoint without token         | GET          | 401                                      |       |
| Any endpoint with wrong `x-org-id` | GET          | 200 empty (not 403)                      |       |

---

## 14. Infrastructure

| #   | What to check                                                | Expected                                      | Pass? |
| --- | ------------------------------------------------------------ | --------------------------------------------- | ----- |
| 1   | `docker compose up` — all containers start                   | All green in compose logs                     |       |
| 2   | All health checks pass                                       | `docker compose ps` shows all healthy         |       |
| 3   | `kubectl apply -k infra/k8s/overlays/dev` (if k8s available) | All pods Running                              |       |
| 4   | Postgres persistence                                         | Restart postgres container → data survives    |       |
| 5   | Redis persistence                                            | Restart redis container → task state survives |       |
| 6   | `INTERNAL_SERVICE_SECRET` mismatch                           | `POST /internal/tasks` returns 401            |       |

---

## 15. Known Issues / Out of Scope

| Issue                                                                                                                               | Status                            |
| ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Go module cache must be populated (`go mod tidy`) before stream-engine tests run                                                    | Fixed — go.sum committed          |
| Discord bot `clip.ts` / `math.ts` / `scramble.ts` commands have pre-existing TS type errors from Discord.js `PartialGroupDMChannel` | Pre-existing, not introduced here |
| Zod v4 `z.record()` requires two args — `AutonomyBody.config` in core-app has this pre-existing error                               | Pre-existing                      |
| Mobile app not yet published to TestFlight / Play Store                                                                             | Out of scope for this sprint      |
| Tauri desktop `mediamtx` binary must be in `PATH` or bundled                                                                        | Deployment concern                |

---

## QA Sign-off

| Area                        | Tester | Date | Result |
| --------------------------- | ------ | ---- | ------ |
| Auth (web + mobile)         |        |      |        |
| Dashboard + Agents (web)    |        |      |        |
| Stream page (web + desktop) |        |      |        |
| Approval gate E2E           |        |      |        |
| Twitch bot                  |        |      |        |
| Discord bot                 |        |      |        |
| Auto-mod                    |        |      |        |
| Stream engine               |        |      |        |
| Mobile app (all screens)    |        |      |        |
| Skills seed                 |        |      |        |
| API smoke tests             |        |      |        |
| Infrastructure              |        |      |        |
