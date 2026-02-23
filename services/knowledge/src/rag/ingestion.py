import logging
import uuid
from typing import List, Optional

from src.main import prisma
from src.rag.chunking import chunk_text
from src.rag.embeddings import embedding_service
from src.storage.chroma import get_or_create_collection
from src.storage.documents import create_document, store_document_chunks, update_document_status

logger = logging.getLogger(__name__)

async def ingest_document_pipeline(
    org_id: str,
    title: str,
    source_type: str,
    collection_id: str,
    content: str,
    source_url: Optional[str] = None,
    mime_type: Optional[str] = None,
    tags: Optional[List[str]] = None
):
    """
    Orchestrates ingestion: 
    1. Create Document (Pending)
    2. Chunk Text
    3. Generate Embeddings
    4. Store in ChromaDB
    5. Store chunks in Prisma (Indexed)
    """

    # 1. Create Document
    doc = await create_document(
        org_id=org_id,
        title=title,
        source_type=source_type,
        collection_id=collection_id,
        source_url=source_url,
        mime_type=mime_type,
        content=content,
        tags=tags
    )

    await update_document_status(doc.id, "processing")

    try:
        # 2. Chunk text
        chunks = chunk_text(content, metadata={"doc_id": doc.id, "org_id": org_id})

        if not chunks:
            await update_document_status(doc.id, "failed", 0)
            return doc

        # 3. Embed chunks
        texts = [c["content"] for c in chunks]
        embeddings = await embedding_service.get_embeddings(texts)

        # 4. Store in Chroma
        collection = get_or_create_collection(collection_id)

        ids = [str(uuid.uuid4()) for _ in chunks]
        metadatas = [{"doc_id": doc.id, "org_id": org_id, "chunk_index": c["chunkIndex"]} for c in chunks]

        collection.add(
            ids=ids,
            embeddings=embeddings,
            metadatas=metadatas,
            documents=texts
        )

        # 5. Store in Prisma
        prisma_chunks = []
        for i, c in enumerate(chunks):
            c["chromaId"] = ids[i]
            prisma_chunks.append(c)

        await store_document_chunks(doc.id, prisma_chunks)
        await update_document_status(doc.id, "indexed", len(chunks))

        # Create IngestionJob record
        await prisma.ingestionjob.create(data={
            "orgId": org_id,
            "documentId": doc.id,
            "sourceType": source_type,
            "status": "completed",
            "chunksCreated": len(chunks)
        })

        return await prisma.document.find_unique(where={"id": doc.id})

    except Exception as e:
        logger.error(f"Ingestion failed for doc {doc.id}: {e}")
        await update_document_status(doc.id, "failed", 0)

        await prisma.ingestionjob.create(data={
            "orgId": org_id,
            "documentId": doc.id,
            "sourceType": source_type,
            "status": "failed",
            "chunksCreated": 0
        })
        raise e
