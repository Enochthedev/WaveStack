
🚀 Development Setup

1. Clone and Install

git clone <https://github.com/you/wavestack.git>
cd wavestack

2. Environment Variables

Copy the example env and update values:

cp .env.example .env

Create a symlink so Docker Compose (inside infra/) can see it:

ln -s ../.env infra/.env

Verify:

ls -l infra/.env

# should print: infra/.env -> ../.env

💡 On Windows (PowerShell):

New-Item -ItemType SymbolicLink -Path infra/.env -Target ../.env

3. Bring Up Services

Use Docker profiles to only run what you need:

# Base stack (DB, Redis, Core)

docker compose -f infra/compose.yaml --profile base up -d

# Add media (Clipper)

docker compose -f infra/compose.yaml --profile base --profile media up -d

# Add proxy (Caddy)

docker compose -f infra/compose.yaml --profile base --profile media --profile proxy up -d

# Add automations (n8n)

docker compose -f infra/compose.yaml --profile base --profile ops up -d

4. Makefile Shortcuts

We provide a Makefile so you don’t have to remember the long commands:

ENV ?= ./.env
COMPOSE = docker compose --env-file $(ENV) -f infra/compose.yaml

up-base:
 $(COMPOSE) --profile base up -d --build

up-media:
 $(COMPOSE) --profile base --profile media up -d --build

up-proxy:
 $(COMPOSE) --profile base --profile media --profile proxy up -d --build

up-ops:
 $(COMPOSE) --profile base --profile ops up -d --build

down:
 $(COMPOSE) down --remove-orphans

Usage:

make up-base
make up-media
make up-proxy
make down

⸻

That way:
 • New devs only run cp .env.example .env && ln -s ../.env infra/.env.
 • After that, they just use make commands.

👉 Want me to generate the actual Makefile in your repo now, so it’s ready to go?
