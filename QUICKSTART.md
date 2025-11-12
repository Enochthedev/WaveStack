# ⚡ Quick Start - Running WaveStack

## Option 1: Docker Compose (Recommended)

```bash
# 1. Set up environment
cp .env.example .env
# Edit .env if needed (default values should work)

# 2. Start all services
docker-compose up -d

# 3. Check service status
docker-compose ps

# 4. Run database migrations
docker-compose exec core-app pnpm prisma migrate dev --name init

# 5. View logs
docker-compose logs -f core-app clipper

# 6. Test the APIs
curl http://localhost:3000/api/queue
curl http://localhost:8000/api/v1/health
```

## Option 2: Local Development (No Docker)

### Prerequisites
```bash
# Install Node.js 18+ and pnpm
node --version  # Should be 18+
pnpm --version  # Should be 8+

# Install Python 3.11+ and pip
python --version  # Should be 3.11+
```

### Start PostgreSQL & Redis
```bash
# macOS with Homebrew
brew install postgresql redis
brew services start postgresql redis

# Ubuntu/Debian
sudo apt install postgresql redis-server
sudo systemctl start postgresql redis
```

### Set Up Core App
```bash
cd apps/core-app

# Install dependencies
pnpm install

# Configure environment
cat << 'EOF' > .env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/wavestack_dev
REDIS_URL=redis://localhost:6379
PORT=3000
AUTH_MODE=none
EOF

# Create database
createdb wavestack_dev

# Run migrations
pnpm prisma generate
pnpm prisma migrate dev --name init

# Start development server
pnpm dev
# Server runs on http://localhost:3000
```

### Set Up Clipper Service
```bash
cd services/clipper

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Install ffmpeg
# macOS: brew install ffmpeg
# Ubuntu: sudo apt install ffmpeg

# Configure environment
cat << 'EOF' > .env
REDIS_URL=redis://localhost:6379
DATA_DIR=./data/clips
LOG_LEVEL=INFO
EOF

# Start FastAPI server
uvicorn app.main:app --reload --port 8000
# Server runs on http://localhost:8000
# API docs at http://localhost:8000/api/docs
```

## Testing the Setup

### 1. Test Core App
```bash
# Health check
curl http://localhost:3000/api/queue

# Get auth token (if AUTH_MODE != none)
curl -X POST http://localhost:3000/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "dev-client",
    "client_secret": "dev-secret"
  }'
```

### 2. Test Clipper Service
```bash
# Health check
curl http://localhost:8000/api/v1/health

# Create a test clip (using public test video)
curl -X POST http://localhost:8000/api/v1/clip \
  -H "Content-Type: application/json" \
  -d '{
    "source": "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4",
    "start_sec": 2,
    "duration_sec": 5,
    "out_ext": "mp4"
  }'
```

### 3. Run Tests
```bash
# Core App tests
cd apps/core-app
pnpm test

# Clipper tests
cd services/clipper
pytest -v
```

## Running Specific Services

### Just the database
```bash
docker-compose up -d postgres redis
```

### Core app + database
```bash
docker-compose up -d postgres redis core-app
```

### Full media stack
```bash
docker-compose --profile media up -d
```

### With n8n workflow engine
```bash
docker-compose --profile ops up -d
```

## Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f core-app
docker-compose logs -f clipper

# Last 100 lines
docker-compose logs --tail=100 core-app
```

## Stopping Services

```bash
# Stop all
docker-compose down

# Stop and remove volumes (clears database)
docker-compose down -v

# Stop specific service
docker-compose stop core-app
```

## Troubleshooting

### Port already in use
```bash
# Check what's using port 3000
lsof -i :3000

# Change port in .env
CORE_PORT=3001
```

### Database connection errors
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# View logs
docker-compose logs postgres

# Reset database
docker-compose down -v
docker-compose up -d postgres
```

### Prisma errors
```bash
cd apps/core-app
pnpm prisma generate
pnpm prisma migrate dev
```

## Next Steps

1. ✅ **Read DEMO.md** - Detailed walkthrough of improvements
2. ✅ **Read docs/LOCAL-SETUP.md** - Comprehensive setup guide
3. ✅ **Read docs/BOT-INTEGRATION.md** - Build Discord/Twitch bots
4. ✅ **Run tests** - `pnpm test` and `pytest`
5. ✅ **Check API docs** - http://localhost:8000/api/docs (Clipper)

## Useful Commands

```bash
# View all Docker Compose services
docker-compose config --services

# Restart a service
docker-compose restart core-app

# Execute command in container
docker-compose exec core-app sh

# View database
docker-compose exec postgres psql -U postgres -d wave

# View Redis
docker-compose exec redis redis-cli

# Generate Prisma client
docker-compose exec core-app pnpm prisma generate

# Create migration
docker-compose exec core-app pnpm prisma migrate dev --name your_migration_name
```

---

**You're all set!** 🚀 Check out DEMO.md for a detailed tour of what was built.
