from chromadb.api.models.Collection import Collection

import src.main as app_main


def get_chroma_client():
    if not app_main.chroma_client:
        raise RuntimeError("Chroma client not initialized")
    return app_main.chroma_client

def get_or_create_collection(name: str) -> Collection:
    client = get_chroma_client()
    # Using cosine similarity as default for standard embeddings
    return client.get_or_create_collection(
        name=name,
        metadata={"hnsw:space": "cosine"}
    )

def get_collection(name: str) -> Collection:
    client = get_chroma_client()
    return client.get_collection(name=name)

def delete_collection(name: str):
    client = get_chroma_client()
    client.delete_collection(name=name)

def list_collections():
    client = get_chroma_client()
    return client.list_collections()
