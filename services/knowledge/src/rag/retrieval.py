from typing import Any, Dict, List

from src.rag.embeddings import embedding_service
from src.storage.chroma import get_collection


async def semantic_search(
    query: str,
    collection_id: str,
    org_id: str,
    n_results: int = 5,
    min_relevance: float = 0.0
) -> List[Dict[str, Any]]:
    """
    Searches for semantically similar chunks based on a text query.
    """
    # 1. Embed query
    query_embeddings = await embedding_service.get_embeddings([query])
    if not query_embeddings:
        return []

    embedding = query_embeddings[0]

    # 2. Query collection
    try:
        collection = get_collection(collection_id)
    except Exception:
        # Collection might not exist yet
        return []

    results = collection.query(
        query_embeddings=[embedding],
        n_results=n_results,
        where={"org_id": org_id}, # Filter via metadata
        include=["metadatas", "documents", "distances"]
    )

    # Extract matches
    matches = []
    if not results or not results["ids"]:
        return []

    ids = results["ids"][0]
    distances = results["distances"][0] if results.get("distances") else [0]*len(ids)
    documents = results["documents"][0] if results.get("documents") else [""]*len(ids)
    metadatas = results["metadatas"][0] if results.get("metadatas") else [{}]*len(ids)

    for i in range(len(ids)):
        # Calculate similarity (Cosine distance -> similarity)
        # Assuming distance is 1 - cosine_similarity roughly for Chroma normalized
        similarity = 1.0 - distances[i]

        if similarity >= min_relevance:
            matches.append({
                "chromaId": ids[i],
                "content": documents[i],
                "metadata": metadatas[i],
                "relevance": similarity,
                "distance": distances[i]
            })

    # Sort matches by relevance
    matches.sort(key=lambda x: x["relevance"], reverse=True)
    return matches
