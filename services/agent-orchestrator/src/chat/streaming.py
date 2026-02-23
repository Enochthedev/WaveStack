import asyncio
from typing import AsyncGenerator

class ChatStreaming:
    """
    Utilities for streaming agent responses back to the client via Server-Sent Events (SSE).
    """
    
    @staticmethod
    async def stream_response(content: str) -> AsyncGenerator[str, None]:
        """
        Simulates word-by-word streaming of a response.
        """
        words = content.split(" ")
        for word in words:
            # Yielding SSE format
            yield f"data: {word} \n\n"
            await asyncio.sleep(0.05)
        # End stream
        yield "data: [DONE]\n\n"
