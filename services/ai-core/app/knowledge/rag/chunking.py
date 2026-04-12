from typing import Any, Dict, List

from langchain_text_splitters import RecursiveCharacterTextSplitter

from src.config import get_settings

settings = get_settings()

def get_text_splitter() -> RecursiveCharacterTextSplitter:
    """Returns a configured RecursiveCharacterTextSplitter."""
    return RecursiveCharacterTextSplitter(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
        separators=["\n\n", "\n", " ", ""]
    )

def chunk_text(text: str, metadata: Dict[str, Any] = None) -> List[Dict[str, Any]]:
    """Splits raw text into manageable chunks and attaches metadata."""
    splitter = get_text_splitter()

    # Langchain splitting
    langchain_docs = splitter.create_documents([text], metadatas=[metadata] if metadata else None)

    chunks = []
    for i, doc in enumerate(langchain_docs):
        # basic token estimate rule of thumb (4 chars per token roughly natively without tokenizer)
        token_count_est = len(doc.page_content) // 4
        chunks.append({
            "chunkIndex": i,
            "content": doc.page_content,
            "metadata": doc.metadata,
            "tokenCount": token_count_est
        })
    return chunks
