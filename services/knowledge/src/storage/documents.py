from typing import List, Optional

from src.main import prisma


async def create_document(
    org_id: str,
    title: str,
    source_type: str,
    collection_id: str,
    source_url: Optional[str] = None,
    mime_type: Optional[str] = None,
    content: Optional[str] = None,
    tags: Optional[List[str]] = None
):
    """Creates a new Document entry with pending status."""
    return await prisma.document.create(
        data={
            "orgId": org_id,
            "title": title,
            "sourceType": source_type,
            "sourceUrl": source_url,
            "mimeType": mime_type,
            "content": content,
            "collectionId": collection_id,
            "tags": tags or [],
            "status": "pending",
        }
    )

async def get_document(doc_id: str):
    """Retrieves a document by ID including its chunks."""
    return await prisma.document.find_unique(
        where={"id": doc_id},
        include={"chunks": True}
    )

async def update_document_status(doc_id: str, status: str, chunk_count: int = 0):
    """Updates document ingestion pipeline status."""
    return await prisma.document.update(
        where={"id": doc_id},
        data={
            "status": status,
            "chunkCount": chunk_count
        }
    )

async def store_document_chunks(doc_id: str, chunks_data: List[dict]):
    """Stores multiple chunks in the DocumentChunk table."""
    # chunks_data is expected to be a list of dicts:
    # {"chunkIndex": int, "content": str, "tokenCount": int, "chromaId": str}
    create_data = [
        {
            "documentId": doc_id,
            "chunkIndex": chunk["chunkIndex"],
            "content": chunk["content"],
            "tokenCount": chunk["tokenCount"],
            "chromaId": chunk["chromaId"]
        }
        for chunk in chunks_data
    ]

    # create_many is not fully supported in all aioprisma adapters, so we loop conceptually or use create_many if supported
    # Prisma Python supports create_many
    return await prisma.documentchunk.create_many(
        data=create_data # type: ignore
    )

async def delete_document(doc_id: str):
    """Deletes a document and cascades to chunks (managed by schema Cascade)."""
    return await prisma.document.delete(
        where={"id": doc_id}
    )

# --- Context Rules Helpers ---
async def get_context_rule_by_agent(org_id: str, agent_type: str):
    """Retrieve a context rule affecting an agent."""
    rule = await prisma.contextrule.find_first(
        where={
            "orgId": org_id,
            "agentType": agent_type
        }
    )
    # Fallback to wildcard rule
    if not rule:
        rule = await prisma.contextrule.find_first(
            where={
                "orgId": org_id,
                "agentType": "*"
            }
        )
    return rule
