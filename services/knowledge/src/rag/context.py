from typing import Any, Dict

from src.rag.retrieval import semantic_search
from src.storage.documents import get_context_rule_by_agent


async def build_agent_context(org_id: str, agent_type: str, query: str) -> Dict[str, Any]:
    """
    Retrieves context for a specific agent based on predefined ContextRules.
    """
    # 1. Fetch rules for agent
    rule = await get_context_rule_by_agent(org_id, agent_type)

    if not rule or not rule.collectionIds:
        return {
            "systemPrompt": None,
            "contextSnippets": [],
            "error": "No context rules or collections available for this agent"
        }

    n_results = rule.maxChunks
    min_relevance = rule.minRelevance

    # 2. Search collections
    all_snippets = []
    for collection_id in rule.collectionIds:
        # We perform search on each mapped collection
        snippets = await semantic_search(
            query=query,
            collection_id=collection_id,
            org_id=org_id,
            n_results=n_results,
            min_relevance=min_relevance
        )
        all_snippets.extend(snippets)

    # 3. Consolidate & Rerank (Simple relevance sort across collections)
    all_snippets.sort(key=lambda x: x["relevance"], reverse=True)

    # Truncate to max chunks globally across collections
    final_snippets = all_snippets[:n_results]

    return {
        "systemPrompt": rule.systemPrompt,
        "contextSnippets": final_snippets
    }
