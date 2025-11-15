"""
Inference API Routes
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
import logging

from ..serving.inference import inference_server

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1", tags=["inference"])


class GenerateRequest(BaseModel):
    """Request to generate text"""
    system_prompt: Optional[str] = None
    history: Optional[List[Dict[str, str]]] = None
    message: str = Field(..., description="User message")
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None


class GenerateResponse(BaseModel):
    """Generated text response"""
    response: str
    model_info: Optional[Dict] = None


class ModelInfo(BaseModel):
    """Model information"""
    org_id: str
    model_path: str
    metadata: Dict
    loaded: bool


@router.post("/generate", response_model=GenerateResponse)
async def generate_text(
    org_id: str,
    request: GenerateRequest,
):
    """
    Generate text using a fine-tuned model

    This is the main endpoint called by the AI personality service
    when using the 'local' provider option.

    Example:
    ```
    POST /api/v1/generate?org_id=org_123
    {
        "system_prompt": "You are a helpful assistant...",
        "history": [
            {"role": "user", "content": "Hello"},
            {"role": "assistant", "content": "Hi! How can I help?"}
        ],
        "message": "Tell me a joke",
        "temperature": 0.8,
        "max_tokens": 100
    }
    ```
    """
    try:
        # Build full prompt with history
        if request.history:
            # Combine history into a single prompt
            full_prompt = ""
            for msg in request.history:
                role = msg.get("role", "user")
                content = msg.get("content", "")
                full_prompt += f"{role.capitalize()}: {content}\n"
            full_prompt += f"User: {request.message}\nAssistant:"
        else:
            full_prompt = request.message

        # Generate
        response = inference_server.generate(
            org_id=org_id,
            prompt=full_prompt,
            system_prompt=request.system_prompt,
            max_new_tokens=request.max_tokens,
            temperature=request.temperature,
        )

        if response is None:
            raise HTTPException(
                status_code=500,
                detail="Generation failed. Model may not be loaded."
            )

        # Get model info
        model_info = inference_server.get_model_info(org_id)

        return GenerateResponse(
            response=response,
            model_info=model_info,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Generation failed for org {org_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/models/load")
async def load_model(org_id: str, model_id: str = "latest"):
    """
    Manually load a model into memory

    By default, models are auto-loaded on first inference request.
    Use this endpoint to pre-load a model.
    """
    try:
        success = inference_server.load_model(org_id, model_id)

        if not success:
            raise HTTPException(
                status_code=404,
                detail=f"Failed to load model for org {org_id}"
            )

        model_info = inference_server.get_model_info(org_id)

        return {
            "message": "Model loaded successfully",
            "model_info": model_info,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/models/unload")
async def unload_model(org_id: str):
    """
    Unload a model from memory

    Use this to free GPU memory when the model is not needed.
    """
    try:
        inference_server.unload_model(org_id)

        return {
            "message": "Model unloaded successfully",
            "org_id": org_id,
        }

    except Exception as e:
        logger.error(f"Failed to unload model: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/models/{org_id}/info", response_model=ModelInfo)
async def get_model_info(org_id: str):
    """Get information about a loaded model"""
    model_info = inference_server.get_model_info(org_id)

    if model_info is None:
        raise HTTPException(
            status_code=404,
            detail=f"No model loaded for org {org_id}"
        )

    return ModelInfo(**model_info)


@router.get("/models/{org_id}/list")
async def list_models(org_id: str):
    """List all available models for an organization"""
    try:
        models = inference_server.list_available_models(org_id)

        return {
            "org_id": org_id,
            "models": models,
            "count": len(models),
        }

    except Exception as e:
        logger.error(f"Failed to list models: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    import torch

    return {
        "status": "healthy",
        "cuda_available": torch.cuda.is_available(),
        "cuda_device_count": torch.cuda.device_count() if torch.cuda.is_available() else 0,
        "loaded_models": len(inference_server.loaded_models),
    }
