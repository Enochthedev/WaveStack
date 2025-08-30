# WaveStack — Production Deployment Guide

This document captures the **prod-ready** pattern we validated in dev and the deltas required for a hardened production rollout. It focuses on auth (RS256+JWKS), gateway enforcement with `auth_request`, rate limiting, secrets, observability, and safe rollout steps.

---

## 1) High‑level architecture

**Edge/Gateway (NGINX or equivalent)**

- Terminates TLS.
- Enforces auth via `auth_request` → `core-app /api/auth/validate`.
- Forwards identity headers (`X-User-Id`, `X-Scopes`) to upstream services.
- Per‑IP and optional per‑user rate limiting; basic WAF guards.
- Serves static `/files/*` from the shared `clips` volume (read‑only).

**Core App (Fastify)**

- **Validates** tokens (JWKS), does **not** mint tokens in prod.
- Exposes `/api/*`, `/api/auth/validate`, health at `/api/health`.
- Talks to Redis/Postgres and to Clipper via internal URL.

**Clipper (FastAPI + worker)**

- Handles long‑running ffmpeg jobs pushed via queue.
- Renders public file URLs (served by gateway from shared volume).

**Data plane**

- Postgres (primary DB), Redis (queues + rate‑limit counters).
- Shared volume `clips` mounted read‑only to gateway for `/files/*`.

---

## 2) Environment variables (prod)

Define non‑secret env in the **project root env** and service‑specific in each service. **Secrets must not live in .env files in prod**; use Vault/SOPS/SealedSecrets/KMS.

### Root (`.env`, non‑secret defaults)

```
# Ports and service URLs
CORE_PORT=3000
CORE_PORT_INTERNAL=3000
CLIPPER_PORT=8081
CLIPPER_PORT_INTERNAL=8080
CLIPPER_INTERNAL_URL=http://clipper:${CLIPPER_PORT_INTERNAL}

# Gateway
NGINX_HTTP_PORT=80
NGINX_HTTP_PORT_INTERNAL=80
NGINX_HTTPS_PORT=443
NGINX_HTTPS_PORT_INTERNAL=443

# Storage
STORAGE_BACKEND=local
# In prod, point to your gateway public hostname
STORAGE_PUBLIC_BASE=https://api.yourdomain.com/files

# Time zone
TZ=UTC
```

### Core App (`apps/core-app/.env`, service‑specific)

```bash
PORT=${CORE_PORT_INTERNAL}
DATABASE_URL=${DATABASE_URL}          # from secret
REDIS_URL=${REDIS_URL}                # from secret
CLIPPER_INTERNAL_URL=${CLIPPER_INTERNAL_URL}

# Auth (prod)
AUTH_MODE=jwks
AUTH_ISSUER=https://auth.yourdomain.com/
AUTH_AUDIENCE=wavestack
AUTH_JWKS_URL=https://auth.yourdomain.com/.well-known/jwks.json
AUTH_TOKEN_TTL_SECONDS=900            # typically short

# Internal service-to-service token (optional)
CORE_INTERNAL_TOKEN=${CORE_INTERNAL_TOKEN}  # from secret
```

### Secrets (store in Vault/KMS or sealed‑secrets)

- `DATABASE_URL` (includes username/password/hostname).
- `REDIS_URL` (with password if used).
- `CORE_INTERNAL_TOKEN` (optional).
- **No** `SERVICE_CLIENTS_JSON`, **no** `AUTH_JWT_SECRET` in prod.
- Gateways/clients obtain tokens from your IdP (Auth0/Okta/Keycloak/Cognito).

---

## 3) Gateway (NGINX) config

Key prod‑safe bits we validated:

```nginx
# inside http { ... } with real TLS certs at the server{} block
map $request_id $req_id { default $request_id; }
limit_req_zone $binary_remote_addr zone=perip:10m rate=100r/m;

upstream core_app { server core-app:${CORE_PORT_INTERNAL}; }
upstream clipper  { server clipper:${CLIPPER_PORT_INTERNAL}; }

server {
  listen ${NGINX_HTTP_PORT_INTERNAL};      # 80 behind LB or 443 with TLS
  # add ssl_certificate/ssl_certificate_key when terminating TLS here

  # Health
  location = /healthz { return 200 "ok"; }

  # Static files (read-only)
  location /files/ {
    alias /data/;
    autoindex off;                          # disable directory listing in prod
    add_header Access-Control-Allow-Origin *;
  }

  # Auth subrequest to core validator
  location = /_auth/validate {
    internal;
    proxy_pass http://core_app/api/auth/validate;
    proxy_pass_request_body off;
    proxy_set_header Content-Length "";
    proxy_set_header Authorization $http_authorization;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Request-Id $request_id;
  }

  # Protected API
  location /api/ {
    auth_request /_auth/validate;
    error_page 401 = @unauthorized;
    error_page 403 = @forbidden;

    # Propagate identity derived by validator
    auth_request_set $auth_user_id $upstream_http_x_user_id;
    auth_request_set $auth_scopes  $upstream_http_x_scopes;
    proxy_set_header X-User-Id $auth_user_id;
    proxy_set_header X-Scopes  $auth_scopes;

    # Rate limit
    limit_req zone=perip burst=20 nodelay;

    # Proxy upstream
    proxy_pass http://core_app$request_uri;
    proxy_redirect off;
    proxy_set_header Host $host;
    proxy_set_header Authorization $http_authorization;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Request-Id $request_id;
  }

  location @unauthorized { return 401; }
  location @forbidden    { return 403; }
}
```

**Public endpoints** that should bypass auth must have explicit `location` blocks **before** `/api/`.

---

## 4) Auth in prod

- Tokens are minted by your **IdP**; core only validates:
  - `AUTH_MODE=jwks`, `AUTH_ISSUER`, `AUTH_AUDIENCE`, `AUTH_JWKS_URL`.
- Core’s `/api/auth/validate` verifies RS256 tokens (iss/aud/exp/nbf) and emits:
  - `X-User-Id: <sub>`
  - `X-Scopes: <comma-separated-scopes>`
- Remove dev endpoints `/api/auth/token` and any in‑process key generation from the image.

**Key rotation:** JWKS enables zero‑downtime rotation. Keep token TTLs short and rely on IdP rotation; set JWKS cache TTL modestly (e.g., 10–15 min with background refresh).

---

## 5) Observability & logging

- **Gateway access log**: include `req_id`, `$auth_user_id`, `$request_time`, `$upstream_response_time`.
- **App logs**: structured (JSON), include `request_id` correlation (propagate header).
- **Metrics**: gateway 2xx/4xx/5xx, auth failures, rate‑limit hits, queue depth, worker success/failure, ffmpeg durations.
- **Tracing** (optional): OpenTelemetry via Fastify plugin and gateway headers.

---

## 6) Security hardening

- TLS at the edge (Let’s Encrypt/ACME or managed certs); HSTS.
- mTLS or a service‑mesh (Istio/Linkerd/Consul) for east‑west if requirements demand.
- Secrets via Vault/SOPS/KMS; never commit secrets to git.
- Firewall/LB allowlist for admin endpoints.
- Minimal WAF filters for obvious injections; prefer a dedicated WAF at the LB if available.

---

## 7) Rollout plan

1. **Pre‑flight**
   - Migrate DB (Prisma): `pnpm prisma migrate deploy`.
   - Verify Redis/queues reachable.
   - Verify JWKS reachable from core pods/containers.

2. **Deploy**
   - Build and push images.
   - Apply secrets (Vault/KMS → env/sidecar).
   - Start DB + Redis, then core, clipper, worker, gateway (in that order).
   - Verify health:
     - `GET /api/health` via gateway → 200
     - `/_auth/validate` subrequest (manually curl core with a valid token)

3. **Smoke tests**
   - Obtain a prod token from IdP and hit `GET /api/health` via gateway with `Authorization: Bearer <token>`.
   - Enqueue a small clip job and verify worker completes; confirm file served at `/files/...`.

4. **Monitoring on**
   - Enable dashboards/alerts (CPU/mem, 5xx rate, latency p95, queue depth).
   - Log sampling/retention policies set.

5. **Rollback**
   - Keep previous image tags available.
   - DB migrations are forward‑only; test rollbacks in staging or use shadow tables.

---

## 8) Kubernetes notes (future)

- Replace Docker DNS names with k8s Services (`core-app.default.svc.cluster.local`).
- Use Ingress (nginx/traefik) with external‑auth or `auth_request` equivalent.
- Secrets as `Secret` objects sourced from external manager (ESO/SealedSecrets).
- Shared `/files` via ReadWriteMany PVC or object storage + signed URLs.

---

## 9) Troubleshooting

- **Gateway 500 on `/api/*`**  
  Most common cause: `auth_request` body forwarding mismatch. Ensure:

  ```
  proxy_pass_request_body off;
  proxy_set_header Content-Length "";
  ```

  in the `/_auth/validate` location.

- **401 from `/api/auth/validate`**  
  Missing/invalid `Authorization` header or mismatched `iss`/`aud`. Check token, env vars, and clock skew.

- **Files 404 under `/files/`**  
  Confirm `clips` volume is mounted to gateway and clipper writes to `/data`.

- **Worker idle**  
  Verify Redis connectivity and that the worker container is running and subscribed to the correct queue.

---

## 10) Go‑live checklist

- [ ] Auth via JWKS with a real IdP; dev token endpoint removed.
- [ ] TLS on edge; correct hostnames; HSTS.
- [ ] Rate limiting enabled (per‑IP) and optionally per‑user.
- [ ] Access logs structured with request ID and user.
- [ ] Secrets sourced from Vault/KMS (no plaintext .env in prod).
- [ ] Health checks wired; dashboards & alerts active.
- [ ] Rollback images available; DB migration plan validated.
- [ ] Smoke tests documented and repeatable.

---

## 11) Identity Provider (IdP) — bootstrap-friendly options

We validate tokens at the gateway via `/api/auth/validate`. In production, **tokens must be minted by a real IdP**. For a $0 bootstrapped setup, we recommend **Keycloak (self‑hosted)**. Alternatives are listed below.

### TL;DR — what stays the same

- **Gateway**: still calls `/_auth/validate` before proxying `/api/*`.
- **Core**: still validates RS256 via JWKS (iss/aud/exp/nbf), no token minting in prod images.
- **Services**: continue to receive `X-User-Id` and `X-Scopes` from the gateway.

### What changes

- Tokens now come from your IdP (Keycloak/…): clients use **OAuth2 client_credentials** (for M2M) or **Authorization Code/PKCE** (for users).
- Core env points to the IdP issuer + JWKS URL (see below). Remove dev endpoints like `/api/auth/token` from production images.

---

## 12) Keycloak (recommended, $0 self‑hosted)

Keycloak provides OAuth2/OIDC, JWKS, roles/scopes, and an admin UI. We run it alongside Postgres in compose or as its own pod in k8s.

### 12.1 Compose service (dev/staging/prod — adjust ports/hostnames)

```yaml
# infra/compose.yaml (example snippet)
keycloak:
  image: quay.io/keycloak/keycloak:24.0
  command: ["start", "--hostname=auth.local", "--proxy=edge"]
  environment:
    KC_DB: postgres
    KC_DB_URL: jdbc:postgresql://postgres:5432/keycloak
    KC_DB_USERNAME: postgres
    KC_DB_PASSWORD: ${POSTGRES_PASSWORD}
    KEYCLOAK_ADMIN: admin
    KEYCLOAK_ADMIN_PASSWORD: admin
  depends_on:
    postgres: { condition: service_healthy }
  ports:
    - "8082:8080"  # local admin; behind LB in prod
```

> In prod: front Keycloak with TLS (LB/Ingress) and a proper DNS name like `auth.yourdomain.com`.

### 12.2 Realm and client setup

1) Open the admin console → create realm **`wavestack`**.
2) Create **client** `gateway` (type: *confidential*). Enable **Service Accounts** for client_credentials.
3) Under **Client Scopes / Mappers**, add scopes you’ll use (e.g., `api:read`, `api:write`). Ensure they appear in the **access token**.
4) Find realm OpenID config (Realm Settings → **OpenID Endpoint Configuration**). Note:
   - **Issuer**: `https://auth.yourdomain.com/realms/wavestack`
   - **JWKS**: `https://auth.yourdomain.com/realms/wavestack/protocol/openid-connect/certs`
5) Create users/roles as needed. For M2M, use the client credentials (client secret) from the `gateway` client.

### 12.3 Core env wiring

`apps/core-app/.env` (non‑secrets can live in env; secrets via Vault/KMS):

```bash
AUTH_MODE=jwks
AUTH_AUDIENCE=wavestack
AUTH_ISSUER=https://auth.yourdomain.com/realms/wavestack
AUTH_JWKS_URL=https://auth.yourdomain.com/realms/wavestack/protocol/openid-connect/certs
# No AUTH_JWT_SECRET and no SERVICE_CLIENTS_JSON in prod
```

### 12.4 Obtaining a token (M2M) for the gateway

From the gateway host (or CI):

```bash
export KC_ISSUER=https://auth.yourdomain.com/realms/wavestack
export KC_TOKEN=$(
  curl -s "$KC_ISSUER/protocol/openid-connect/token" \
   -d grant_type=client_credentials \
   -d client_id=gateway \
   -d client_secret=$GATEWAY_CLIENT_SECRET |
  jq -r .access_token
)
```

Use that token as `Authorization: Bearer $KC_TOKEN` when calling the gateway.

### 12.5 Prod image hygiene

- Remove dev `/api/auth/token` endpoint and the in‑process key generator from the **production** image (keep only the validator).
- Keep JWKS cache small (10–15m). Trust IdP for key rotation.

### 12.6 Troubleshooting

- **401 invalid token**: check iss/aud match and system clocks. Verify the token’s `kid` exists in Keycloak JWKS.
- **Gateway 500 on `/api/*`**: confirm `/_auth/validate` is bodyless (see Section 9) and core is reachable from the gateway container.

---

## 13) Alternative IdPs (also $0 self‑hostable)

- **ZITADEL** (OSS): modern OIDC server, simple admin. Map issuer + JWKS similarly to Keycloak.
- **Ory Hydra (+ Kratos)**: modular, security‑first. More components; great if you prefer building blocks.
- **FusionAuth (Community)**: friendly admin, solid features. Some advanced features are paid but core OIDC works.

**Managed with free/cheap tiers**

- **Firebase Auth / Supabase Auth**: very fast to bootstrap; suitable for consumer apps. Enterprise SSO later can be trickier.
- **Amazon Cognito**: low per‑MAU, good if you’re in AWS; admin UX is OK.

> Avoid relying on Auth0/Okta *dev tenants* for production—limits and terms can bite later. Prefer a proper paid tier if you go that route.

---

## 14) (Optional) Minimal internal issuer for M2M only

If you truly need a tiny stopgap issuer for background jobs only (no user login):

- Run a small service that mints RS256 **client_credentials** tokens and serves a **static JWKS**.
- Store the private key in Vault/KMS; publish only the JWKS. Keep TTL short (≤15m), rotate keys via KMS.
- Core still validates via JWKS; the gateway still calls `/api/auth/validate`.

> This is acceptable short‑term but migrate to Keycloak/another IdP once you need users, MFA, social, or SSO.

---

## 15) Team playbook — adding a new environment

1) Stand up Keycloak (or chosen IdP) and create realm `wavestack`.
2) Create client `gateway` (confidential); record client secret in Vault.
3) Configure **core** with issuer & JWKS; deploy with secrets injected.
4) Point **gateway** to core (`/_auth/validate`) — no changes required at the edge.
5) Smoke test: fetch token via client_credentials → `GET /api/health` through the gateway → expect 200.

---

*Last updated: {{2025-08-28}}*
