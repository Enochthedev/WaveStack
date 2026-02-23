# Knowledge Service

RAG (Retrieval-Augmented Generation) pipeline — ingest documents, chunk text, store embeddings in ChromaDB, provide semantic search and agent-specific context retrieval.

## Stack

| Layer | Choice |
|-------|--------|
| Runtime | Python 3.11 |
| Framework | FastAPI |
| Server | uvicorn |
| ORM | Prisma (PostgreSQL) |
| Cache | Redis 7 |
| Vector DB | ChromaDB |
| Embeddings | OpenAI / Ollama / sentence-transformers |
| Text Splitting | langchain-text-splitters |
| Config | pydantic-settings |

## Port: 3400

## Directory Structure

```
services/knowledge/
├── Dockerfile
├── requirements.txt
├── .env.example
├── prisma/
│   └── schema.prisma
└── src/
    ├── __init__.py
    ├── main.py               # FastAPI app, lifespan (Prisma, Redis, ChromaDB)
    ├── config.py             # pydantic-settings
    ├── api/
    │   ├── __init__.py
    │   └── routes.py         # All endpoints
    ├── rag/
    │   ├── __init__.py
    │   ├── embeddings.py     # Embedding generation
    │   ├── ingestion.py      # Document ingestion pipeline
    │   ├── chunking.py       # Text splitting strategies
    │   ├── retrieval.py      # Semantic search + reranking
    │   └── context.py        # Context rules engine per agent
    └── storage/
        ├── __init__.py
        ├── chroma.py         # ChromaDB wrapper
        └── documents.py      # Document metadata helpers
```

## Database Models

### Document
| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| orgId | String | Organization ID |
| title | String | Document title |
| sourceType | String | "file" / "url" / "platform_history" / "manual" |
| sourceUrl | String? | Origin URL |
| mimeType | String? | File MIME type |
| content | Text? | Raw text content |
| status | String | "pending" / "processing" / "indexed" / "failed" |
| chunkCount | Int | Number of chunks created |
| collectionId | String | ChromaDB collection name |
| tags | String[] | Searchable tags |

### DocumentChunk
| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| documentId | String | FK to Document |
| chunkIndex | Int | Order within document |
| content | Text | Chunk text |
| tokenCount | Int | Token count |
| chromaId | String | ID in ChromaDB |

### ContextRule
| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| orgId | String | Organization ID |
| agentType | String | "content" / "clip" / "*" etc. |
| collectionIds | String[] | Which collections to search |
| maxChunks | Int | Max chunks to return |
| minRelevance | Float | Minimum similarity score |
| systemPrompt | Text? | Additional prompt to prepend |

### IngestionJob
| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| orgId | String | Organization ID |
| documentId | String? | FK to Document |
| sourceType | String | Source type |
| status | String | "queued" / "running" / "completed" / "failed" |
| chunksCreated | Int | Chunks generated |

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Health check |
| POST | `/api/v1/documents/ingest` | Ingest document (file, URL, or text) |
| GET | `/api/v1/documents` | List documents |
| GET | `/api/v1/documents/:id` | Document details |
| DELETE | `/api/v1/documents/:id` | Remove document + embeddings |
| POST | `/api/v1/search` | Semantic search |
| POST | `/api/v1/context` | Get RAG context for agent |
| GET | `/api/v1/collections` | List ChromaDB collections |
| POST | `/api/v1/collections` | Create collection |
| GET | `/api/v1/context-rules` | List context rules |
| PUT | `/api/v1/context-rules` | Create/update context rule |
| GET | `/api/v1/jobs` | List ingestion jobs |

## Environment Variables

```
PORT=3400
DATABASE_URL=postgresql://postgres:wave@postgres:5432/wave
REDIS_URL=redis://redis:6379
CHROMA_HOST=chromadb
CHROMA_PORT=8000
AI_PROVIDER=ollama
OPENAI_API_KEY=
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OLLAMA_BASE_URL=http://ollama:11434
CHUNK_SIZE=512
CHUNK_OVERLAP=50
LOG_LEVEL=INFO
```
