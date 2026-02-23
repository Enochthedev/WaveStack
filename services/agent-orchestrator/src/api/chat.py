from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from typing import Dict, Any

from ..chat.handler import ChatHandler
from ..chat.streaming import ChatStreaming

router = APIRouter(prefix="/chat", tags=["Chat"])
handler = ChatHandler()

@router.post("")
async def send_chat_message(payload: Dict[str, Any]):
    message = payload.get("message", "")
    session_id = payload.get("sessionId", "default")
    
    # Process the message via our handler which decides which agent replies
    response_content = await handler.process_user_message(session_id, message)
    
    # Return as an SSE stream using the utility function
    return StreamingResponse(
        ChatStreaming.stream_response(response_content),
        media_type="text/event-stream"
    )

@router.get("/{sessionId}")
async def get_chat_history(sessionId: str):
    return {"message": f"Chat history for {sessionId}"}
