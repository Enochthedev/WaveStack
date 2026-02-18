# 📖 WaveStack Documentation

> Complete documentation for the WaveStack creator automation platform.

---

## 📂 Documentation Index

### Getting Started
| Document | Description |
|----------|-------------|
| [**QUICKSTART.md**](../QUICKSTART.md) | Get running in 5 minutes with Docker |
| [**LOCAL-SETUP.md**](./LOCAL-SETUP.md) | Detailed local development setup |
| [**QUICKSTART-AI.md**](./QUICKSTART-AI.md) | Quick start for AI features |

### Understanding the Codebase
| Document | Description |
|----------|-------------|
| [**CODEBASE.md**](./CODEBASE.md) | **Complete codebase walkthrough** — every service, directory, and file explained |
| [**ARCHITECTURE.md**](./ARCHITECTURE.md) | System architecture and design decisions |
| [**STRUCTURE.md**](./STRUCTURE.md) | High-level system structure diagrams |

### API & Integration
| Document | Description |
|----------|-------------|
| [**API-REFERENCE.md**](./API-REFERENCE.md) | **Complete API documentation** — all endpoints with examples |
| [**BOT-INTEGRATION.md**](./BOT-INTEGRATION.md) | Discord & Twitch bot setup guide |
| [**AI-PERSONALITY-GUIDE.md**](./AI-PERSONALITY-GUIDE.md) | AI personality system documentation |

### Deployment
| Document | Description |
|----------|-------------|
| [**PROD-DEPLOY.md**](./PROD-DEPLOY.md) | Production deployment guide |
| [**Plans.md**](./Plans.md) | Future roadmap and planned features |

### Additional Resources
| Document | Description |
|----------|-------------|
| [**BOTS-SUMMARY.md**](../BOTS-SUMMARY.md) | Summary of all bot implementations |
| [**BOT-SETUP.md**](../services/BOT-SETUP.md) | Detailed bot configuration guide |
| [**DEMO.md**](../DEMO.md) | Demo of features and improvements |

---

## 🚀 Quick Links

### Start Here
```bash
# Clone and setup
git clone https://github.com/Enochthedev/WaveStack.git
cd WaveStack
cp .env.example .env

# Start everything
docker-compose up -d

# Check status
docker-compose ps
```

### Key URLs (when running locally)
| Service | URL |
|---------|-----|
| Core App | http://localhost:3000 |
| Clipper API | http://localhost:8000 |
| Clipper Docs | http://localhost:8000/api/docs |
| AI Personality | http://localhost:8200 |
| Social Ingest | http://localhost:8100 |
| n8n Workflows | http://localhost:5678 |
| Analytics | http://localhost:8800 |

---

## 🏗️ Repository Structure

```
WaveStack/
├── apps/                    # Main applications
│   └── core-app/            # Central API (TypeScript/Fastify)
├── services/                # Microservices (26+)
│   ├── ai-personality/      # AI digital clone
│   ├── clipper/             # Video clipping (FFmpeg)
│   ├── discord-bot/         # Discord bot
│   ├── twitch-bot/          # Twitch chat bot
│   └── ...                  # See CODEBASE.md for full list
├── workflows/               # n8n automation templates
├── infra/                   # Infrastructure configs
├── docs/                    # This documentation
└── docker-compose.yml       # Service orchestration
```

**Full details:** See [CODEBASE.md](./CODEBASE.md)

---

## 🛠️ Technology Stack

### Languages
- **TypeScript** — Core app, bots, real-time services
- **Python** — AI, video processing, ML training
- **Go** — High-performance analytics, link routing

### Frameworks
- **Fastify** — Node.js web framework (core-app)
- **FastAPI** — Python async web framework
- **Discord.js** — Discord bot framework
- **tmi.js** — Twitch chat library

### Databases
- **PostgreSQL** — Primary data store
- **Redis** — Caching, queues, pub/sub
- **ChromaDB** — Vector embeddings for AI

### Infrastructure
- **Docker Compose** — Local development
- **Caddy/Nginx** — Reverse proxy
- **n8n** — Workflow automation

---

## 📊 Service Categories

### Core Services
| Service | Port | Description |
|---------|------|-------------|
| core-app | 3000 | Central API, auth, queues |
| clipper | 8000 | Video clipping with FFmpeg |
| ai-personality | 8200 | AI digital clone engine |

### Bot Services
| Service | Description |
|---------|-------------|
| discord-bot | Discord community bot |
| twitch-bot | Twitch chat bot |
| telegram-bot | Telegram messaging |
| whatsapp-bot | WhatsApp messaging |

### Publishing Services
| Service | Port | Description |
|---------|------|-------------|
| youtube-publisher | 8500 | YouTube uploads |
| social-publisher | 8600 | Multi-platform publishing |
| twitter-autoposter | - | Twitter automation |

### Analytics Services
| Service | Port | Description |
|---------|------|-------------|
| analytics-dashboard | 8800 | High-performance analytics (Go) |
| social-ingest | 8100 | Cross-platform data collection |
| livestream-analytics | 9500 | Real-time stream stats |

---

## 🔐 Authentication

WaveStack uses JWT (RS256) for authentication:

1. **Token Issuance**: Core app issues tokens
2. **JWKS Validation**: `/.well-known/jwks.json`
3. **Multi-tenancy**: `X-Org-Id` header for organization context

See [API-REFERENCE.md](./API-REFERENCE.md) for auth endpoints.

---

## 🧪 Testing

### Core App (TypeScript)
```bash
cd apps/core-app
pnpm test              # Run tests
pnpm test:watch        # Watch mode
pnpm test:coverage     # Coverage report
```

### Clipper (Python)
```bash
cd services/clipper
pytest -v              # Run tests
pytest --cov=app       # With coverage
```

---

## 📚 Learning Path

### 1. Beginner
1. Read [QUICKSTART.md](../QUICKSTART.md)
2. Run `docker-compose up -d`
3. Explore the Clipper API at http://localhost:8000/api/docs

### 2. Intermediate
1. Read [CODEBASE.md](./CODEBASE.md) to understand the structure
2. Read [API-REFERENCE.md](./API-REFERENCE.md) for all endpoints
3. Set up Discord/Twitch bots with [BOT-INTEGRATION.md](./BOT-INTEGRATION.md)

### 3. Advanced
1. Read [ARCHITECTURE.md](./ARCHITECTURE.md) for design decisions
2. Explore AI features with [AI-PERSONALITY-GUIDE.md](./AI-PERSONALITY-GUIDE.md)
3. Deploy to production with [PROD-DEPLOY.md](./PROD-DEPLOY.md)

---

## 🤝 Contributing

1. Read the [CODEBASE.md](./CODEBASE.md) to understand the structure
2. Check [Plans.md](./Plans.md) for roadmap items
3. Follow the existing code patterns
4. Write tests for new features
5. Update documentation

---

## 📞 Support

- **Twitch**: [twitch.tv/wavedidwhat](https://twitch.tv/wavedidwhat)
- **Twitter/X**: [@wavedidwhat](https://x.com/wavedidwhat)
- **GitHub Issues**: For bug reports and feature requests

---

**WaveStack** — The complete creator automation platform 🌊
