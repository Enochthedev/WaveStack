# Local Development Setup Guide

Complete guide to running WaveStack locally for development.

---

## Prerequisites

### Required Software
- **Docker** >= 20.10 and **Docker Compose** >= 2.0
- **Node.js** >= 18.x (for core-app development)
- **pnpm** >= 8.x (package manager)
- **Python** >= 3.11 (for clipper service development)
- **Git** (for version control)

### Optional (for direct development without Docker)
- **PostgreSQL** >= 16
- **Redis** >= 7
- **ffmpeg** (for clipper service)

---

## Quick Start (Docker Compose)

### 1. Clone the Repository
```bash
git clone https://github.com/wavedidwhat/WaveStack.git
cd WaveStack
```

### 2. Set Up Environment Variables
```bash
# Copy example env files
cp .env.example .env

# Update variables in .env for your environment
# At minimum, set:
# - Database credentials
# - Redis URL
# - Auth secrets
```

### 3. Start Core Services
```bash
# Start PostgreSQL, Redis, Core App
docker-compose up -d postgres redis core-app

# Wait for services to be healthy
docker-compose ps
```

### 4. Run Database Migrations
```bash
# Generate Prisma client and run migrations
cd apps/core-app
pnpm install
pnpm prisma generate
pnpm prisma migrate dev --name init
cd ../..
```

### 5. Start Clipper Service
```bash
docker-compose up -d clipper clipper-worker
```

### 6. (Optional) Start Additional Services
```bash
# n8n workflow engine
docker-compose --profile ops up -d n8n

# Nginx gateway
docker-compose --profile proxy up -d nginx
```

### 7. Verify Everything is Running
```bash
# Check service health
docker-compose ps

# Test core app
curl http://localhost:3000/api/queue

# Test clipper
curl http://localhost:8000/api/v1/health
```

---

## Local Development (Without Docker)

### Core App Setup

#### 1. Install Dependencies
```bash
cd apps/core-app
pnpm install
```

#### 2. Set Up Database
```bash
# Make sure PostgreSQL is running locally
# Create database
createdb wavestack_dev

# Set DATABASE_URL in .env
echo "DATABASE_URL=postgresql://user:password@localhost:5432/wavestack_dev" > .env

# Run migrations
pnpm prisma generate
pnpm prisma migrate dev
```

#### 3. Configure Environment
```bash
# apps/core-app/.env
cat << EOF > .env
DATABASE_URL=postgresql://user:password@localhost:5432/wavestack_dev
REDIS_URL=redis://localhost:6379
PORT=3000

# Auth
AUTH_MODE=jwks
AUTH_JWKS_URL=http://localhost:3000/.well-known/jwks.json
AUTH_AUDIENCE=wavestack-dev
AUTH_ISSUER=wavestack-dev
AUTH_TOKEN_TTL_SECONDS=900

# RSA key storage
AUTH_KEYS_DIR=./keys
AUTH_KEY_ID=wavestack-dev-1

# Service clients
SERVICE_CLIENTS_JSON=[{"client_id":"dev-client","client_secret":"dev-secret","org_id":"org_dev","scopes":"clip:create clip:read queue:write"}]

# Clipper integration
CLIPPER_INTERNAL_URL=http://localhost:8000
EOF
```

#### 4. Start Development Server
```bash
pnpm dev
# Server runs on http://localhost:3000
```

#### 5. Run Tests
```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# With coverage
pnpm test:coverage
```

---

### Clipper Service Setup

#### 1. Create Virtual Environment
```bash
cd services/clipper
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

#### 2. Install Dependencies
```bash
pip install -r requirements.txt
pip install -r requirements-dev.txt  # For testing
```

#### 3. Install ffmpeg
```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt-get install ffmpeg

# Windows (via chocolatey)
choco install ffmpeg
```

#### 4. Configure Environment
```bash
# services/clipper/.env
cat << EOF > .env
REDIS_URL=redis://localhost:6379
DATA_DIR=./data/clips
LOG_LEVEL=INFO
STORAGE_BACKEND=local
EOF
```

#### 5. Start Services
```bash
# Terminal 1: FastAPI server
uvicorn app.main:app --reload --port 8000

# Terminal 2: RQ worker
python -m app.worker
```

#### 6. Run Tests
```bash
# Run all tests
pytest

# With coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_models.py -v
```

---

## Configuration

### Environment Variables

#### Core App (`apps/core-app/.env`)
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/wavestack_dev

# Redis
REDIS_URL=redis://localhost:6379

# Server
PORT=3000
NODE_ENV=development

# Auth - Choose mode: 'none', 'hs256', or 'jwks'
AUTH_MODE=jwks
AUTH_JWKS_URL=http://localhost:3000/.well-known/jwks.json
AUTH_AUDIENCE=wavestack-dev
AUTH_ISSUER=wavestack-dev
AUTH_TOKEN_TTL_SECONDS=900

# RSA Keypair (for jwks mode)
AUTH_KEYS_DIR=./keys
AUTH_KEY_ID=wavestack-dev-1

# Service clients (for machine-to-machine auth)
SERVICE_CLIENTS_JSON=[{"client_id":"clipper-service","client_secret":"clipper-secret-dev","org_id":"org_dev","scopes":"clip:create clip:read"}]

# Clipper integration
CLIPPER_INTERNAL_URL=http://localhost:8000
```

#### Clipper Service (`services/clipper/.env`)
```bash
REDIS_URL=redis://localhost:6379
DATA_DIR=./data/clips
LOG_LEVEL=INFO
STORAGE_BACKEND=local

# Optional: S3 storage
# AWS_ACCESS_KEY_ID=your-key
# AWS_SECRET_ACCESS_KEY=your-secret
# AWS_S3_BUCKET=wavestack-clips
# AWS_REGION=us-east-1
```

### Docker Compose Profiles

WaveStack uses Docker Compose profiles to start different service combinations:

```bash
# Base services (postgres, redis, core-app)
docker-compose up -d

# With media services (clipper)
docker-compose --profile media up -d

# With proxy (nginx)
docker-compose --profile proxy up -d

# With operations tools (n8n)
docker-compose --profile ops up -d

# All services
docker-compose --profile media --profile proxy --profile ops up -d
```

---

## Development Workflow

### Making Changes to Core App

1. **Edit code** in `apps/core-app/src/`
2. **Watch mode** automatically reloads on save (`pnpm dev`)
3. **Add tests** in `apps/core-app/src/__tests__/`
4. **Run tests** with `pnpm test`
5. **Build** with `pnpm build` to verify TypeScript compiles

### Making Changes to Clipper

1. **Edit code** in `services/clipper/app/`
2. **Restart server** (`uvicorn` with `--reload` auto-reloads)
3. **Add tests** in `services/clipper/tests/`
4. **Run tests** with `pytest`
5. **Type check** with `mypy app` (if configured)

### Database Changes

1. **Edit Prisma schema** in `apps/core-app/prisma/schema.prisma`
2. **Create migration**:
   ```bash
   cd apps/core-app
   pnpm prisma migrate dev --name describe_your_change
   ```
3. **Generate client**:
   ```bash
   pnpm prisma generate
   ```
4. **Restart** core-app to load new schema

### Adding New Routes

#### Core App (Fastify)
1. Create route file in `apps/core-app/src/modules/<module>/routes.ts`
2. Register in `apps/core-app/src/server.ts`
3. Add tests in `apps/core-app/src/__tests__/<module>.test.ts`

#### Clipper (FastAPI)
1. Add route in `services/clipper/app/interfaces/http/api/v1/routes.py`
2. Create use case in `services/clipper/app/application/use_cases/`
3. Add tests in `services/clipper/tests/`

---

## Troubleshooting

### Database Connection Errors
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# View logs
docker-compose logs postgres

# Reset database (warning: deletes all data)
docker-compose down -v
docker-compose up -d postgres
pnpm prisma migrate reset
```

### Redis Connection Errors
```bash
# Check if Redis is running
docker-compose ps redis

# Test connection
redis-cli ping

# View logs
docker-compose logs redis
```

### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>

# Or change port in .env
PORT=3001
```

### Prisma Client Out of Sync
```bash
cd apps/core-app
pnpm prisma generate
pnpm prisma migrate dev
```

### ffmpeg Not Found (Clipper)
```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt-get update && sudo apt-get install -y ffmpeg

# Check installation
ffmpeg -version
```

### Auth Token Issues
```bash
# Generate a test token
curl -X POST http://localhost:3000/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "dev-client",
    "client_secret": "dev-secret"
  }'

# Verify token at JWKS endpoint
curl http://localhost:3000/.well-known/jwks.json

# Check auth mode
grep AUTH_MODE apps/core-app/.env
```

---

## Testing

### Unit Tests

#### Core App
```bash
cd apps/core-app
pnpm test                 # Run all tests
pnpm test:watch          # Watch mode
pnpm test:coverage       # With coverage report
pnpm test auth           # Run specific test file
```

#### Clipper
```bash
cd services/clipper
pytest                   # Run all tests
pytest -v                # Verbose output
pytest --cov            # With coverage
pytest tests/test_models.py  # Specific file
```

### Integration Tests

```bash
# Start all services
docker-compose up -d

# Test full clip workflow
./scripts/test-clip-workflow.sh

# Test auth flow
./scripts/test-auth.sh
```

### Manual Testing

#### Create a Clip
```bash
# Get auth token
TOKEN=$(curl -X POST http://localhost:3000/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{"client_id":"dev-client","client_secret":"dev-secret"}' \
  | jq -r '.access_token')

# Create clip
curl -X POST http://localhost:8000/api/v1/clip \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4",
    "start_sec": 2,
    "duration_sec": 5,
    "out_ext": "mp4"
  }'
```

#### Queue Content for Publishing
```bash
curl -X POST http://localhost:3000/api/queue/v1/queue \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-$(date +%s)" \
  -d '{
    "projectId": "proj_test",
    "assetId": "asset_test",
    "title": "Test Video",
    "platforms": ["youtube"],
    "caption": "Test caption"
  }'
```

---

## IDE Setup

### VS Code

Recommended extensions:
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Prisma** - Prisma schema support
- **Python** - Python development
- **Docker** - Docker support

#### `.vscode/settings.json`
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[python]": {
    "editor.defaultFormatter": "ms-python.python"
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "prisma.fileWatcher": true
}
```

### WebStorm/IntelliJ

- Enable TypeScript support
- Configure Node.js interpreter
- Set up Python interpreter for clipper
- Enable Prisma plugin

---

## Git Workflow

### Branch Naming
```bash
# Feature branches
git checkout -b feature/add-discord-bot

# Bug fixes
git checkout -b fix/auth-token-expiry

# Documentation
git checkout -b docs/update-setup-guide
```

### Commits
```bash
# Use conventional commits
git commit -m "feat(auth): add persistent key storage"
git commit -m "fix(queue): extract orgId from JWT headers"
git commit -m "docs: add local development setup guide"
git commit -m "test: add comprehensive auth tests"
```

### Pull Requests
1. Create branch from `main`
2. Make changes and commit
3. Push to remote
4. Open PR with description
5. Wait for CI/CD checks
6. Request review
7. Merge when approved

---

## Next Steps

After getting everything running locally:

1. **Read the docs** - Check `/docs` for architecture and deployment guides
2. **Explore the APIs** - Visit `http://localhost:3000/api` and `http://localhost:8000/api/docs`
3. **Check the roadmap** - See `/docs/Plans.md` for upcoming features
4. **Join the community** - Follow [@wavedidwhat](https://twitch.tv/wavedidwhat) on Twitch
5. **Contribute** - Pick an issue and submit a PR!

---

## Resources

- **Project README**: [/README.md](../README.md)
- **Architecture**: [/docs/ARCHITECTURE.md](./ARCHITECTURE.md)
- **Production Deployment**: [/docs/PROD-DEPLOY.md](./PROD-DEPLOY.md)
- **Bot Integration**: [/docs/BOT-INTEGRATION.md](./BOT-INTEGRATION.md)
- **API Documentation**:
  - Core App: `http://localhost:3000/api`
  - Clipper: `http://localhost:8000/api/docs`

---

## Getting Help

- **Issues**: [GitHub Issues](https://github.com/wavedidwhat/WaveStack/issues)
- **Discussions**: [GitHub Discussions](https://github.com/wavedidwhat/WaveStack/discussions)
- **Discord**: (Coming soon)
- **Twitch**: [twitch.tv/wavedidwhat](https://twitch.tv/wavedidwhat)

---

*Happy coding! 🌊*
