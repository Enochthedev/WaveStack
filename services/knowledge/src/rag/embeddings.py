from typing import List

from openai import AsyncOpenAI

from src.config import get_settings

settings = get_settings()

class EmbeddingService:
    def __init__(self):
        self.provider = settings.ai_provider
        self.openai_client = None

        if self.provider == "openai":
            if not settings.openai_api_key:
                raise ValueError("OPENAI_API_KEY is required when using openai provider")
            self.openai_client = AsyncOpenAI(api_key=settings.openai_api_key)
        elif self.provider == "ollama":
            from httpx import AsyncClient
            self.ollama_client = AsyncClient(base_url=settings.ollama_base_url)
        elif self.provider == "sentence-transformers":
            from sentence_transformers import SentenceTransformer
            self.model = SentenceTransformer('all-MiniLM-L6-v2')
        else:
            raise ValueError(f"Unsupported AI Provider: {self.provider}")

    async def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []

        if self.provider == "openai":
            response = await self.openai_client.embeddings.create( # type: ignore
                input=texts,
                model=settings.openai_embedding_model
            )
            return [data.embedding for data in response.data]

        elif self.provider == "ollama":
            embeddings = []
            for text in texts:
                resp = await self.ollama_client.post("/api/embeddings", json={
                    "model": "nomic-embed-text",  # Adjust model globally or locally
                    "prompt": text
                })
                resp.raise_for_status()
                data = resp.json()
                embeddings.append(data["embedding"])
            return embeddings

        elif self.provider == "sentence-transformers":
            # sentence-transformers is sync, blocking call warning in async
            return self.model.encode(texts).tolist() # type: ignore

        return []

# Singleton instance
embedding_service = EmbeddingService()
