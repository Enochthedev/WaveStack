from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel

from src.main import prisma
from src.rag.context import build_agent_context
from src.rag.ingestion import ingest_document_pipeline
from src.rag.retrieval import semantic_search
from src.storage.chroma import get_or_create_collection, list_collections

router = APIRouter()

# --- Schemas ---
class IngestRequest(BaseModel):
    orgId: str
    title: str
    sourceType: str
    collectionId: str
    content: str
    sourceUrl: Optional[str] = None
    mimeType: Optional[str] = None
    tags: Optional[List[str]] = []

class SearchRequest(BaseModel):
    query: str
    collectionId: str
    orgId: str
    nResults: int = 5
    minRelevance: float = 0.5

class ContextRequest(BaseModel):
    orgId: str
    agentType: str
    query: str

class ContextRuleCreate(BaseModel):
    orgId: str
    agentType: str
    collectionIds: List[str]
    maxChunks: int = 5
    minRelevance: float = 0.5
    systemPrompt: Optional[str] = None

class CollectionCreate(BaseModel):
    name: str

# --- Endpoints ---

@router.post("/documents/ingest")
async def ingest_document(req: IngestRequest, background_tasks: BackgroundTasks):
    """Ingests a document to ChromaDB via background task"""
    # Create the document synchronously as pending, so we return ID immediately
    from src.storage.documents import create_document
    doc = await create_document(
        org_id=req.orgId,
        title=req.title,
        source_type=req.sourceType,
        collection_id=req.collectionId,
        source_url=req.sourceUrl,
        mime_type=req.mimeType,
        content=req.content,
        tags=req.tags
    )

    # Process RAG ingestion in background
    background_tasks.add_task(
        ingest_document_pipeline,
        org_id=req.orgId,
        title=req.title,
        source_type=req.sourceType,
        collection_id=req.collectionId,
        content=req.content,
        source_url=req.sourceUrl,
        mime_type=req.mimeType,
        tags=req.tags
    )

    return {"message": "Ingestion queued", "documentId": doc.id}

@router.get("/documents")
async def list_documents(orgId: str, limit: int = 50, skip: int = 0):
    docs = await prisma.document.find_many(
        where={"orgId": orgId},
        take=limit,
        skip=skip,
        order={"createdAt": "desc"}
    )
    return docs

@router.get("/documents/{id}")
async def get_document(id: str):
    doc = await prisma.document.find_unique(
        where={"id": id},
        include={"chunks": True}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc

@router.delete("/documents/{id}")
async def delete_document(id: str):
    doc = await prisma.document.find_unique(where={"id": id}, include={"chunks": True})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Delete from chroma
    if doc.chunks:
        try:
            from src.storage.chroma import get_collection
            collection = get_collection(doc.collectionId)
            ids_to_del = [chunk.chromaId for chunk in doc.chunks if chunk.chromaId]
            if ids_to_del:
                collection.delete(ids=ids_to_del)
        except Exception:
            pass # continue Prisma delete even if chroma missing

    # Delete from Prisma (cascades chunks)
    await prisma.document.delete(where={"id": id})
    return {"message": "Deleted"}

@router.post("/search")
async def execute_search(req: SearchRequest):
    results = await semantic_search(
        query=req.query,
        collection_id=req.collectionId,
        org_id=req.orgId,
        n_results=req.nResults,
        min_relevance=req.minRelevance
    )
    return {"results": results}

@router.post("/context")
async def get_context(req: ContextRequest):
    context = await build_agent_context(
        org_id=req.orgId,
        agent_type=req.agentType,
        query=req.query
    )
    return context

@router.get("/collections")
async def get_collections():
    cols = list_collections()
    return {"collections": [c.name for c in cols]}

@router.post("/collections")
async def create_new_collection(req: CollectionCreate):
    col = get_or_create_collection(req.name)
    return {"message": "Collection ready", "name": col.name}

@router.get("/context-rules")
async def get_context_rules(orgId: str):
    rules = await prisma.contextrule.find_many(where={"orgId": orgId})
    return rules

@router.put("/context-rules")
async def upsert_context_rule(req: ContextRuleCreate):
    rule = await prisma.contextrule.find_first(
        where={"orgId": req.orgId, "agentType": req.agentType}
    )
    if rule:
        updated = await prisma.contextrule.update(
            where={"id": rule.id},
            data={
                "collectionIds": req.collectionIds,
                "maxChunks": req.maxChunks,
                "minRelevance": req.minRelevance,
                "systemPrompt": req.systemPrompt
            }
        )
        return updated
    else:
        created = await prisma.contextrule.create(
            data={
                "orgId": req.orgId,
                "agentType": req.agentType,
                "collectionIds": req.collectionIds,
                "maxChunks": req.maxChunks,
                "minRelevance": req.minRelevance, # type: ignore
                "systemPrompt": req.systemPrompt
            }
        )
        return created

@router.get("/jobs")
async def get_jobs(orgId: str, limit: int = 50):
    jobs = await prisma.ingestionjob.find_many(
        where={"orgId": orgId},
        take=limit,
        order={"createdAt": "desc"}
    )
    return jobs
