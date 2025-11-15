"""
Training API Routes
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import logging
from datetime import datetime
import uuid

from ..training.dataset import DatasetPreparator
from ..training.trainer import ModelTrainer
from ..training.evaluator import ModelEvaluator
from ..config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/training", tags=["training"])

# Track active training jobs
active_trainings: Dict[str, Dict] = {}


class ConversationMessage(BaseModel):
    """Single message in a conversation"""
    role: str
    content: str


class Conversation(BaseModel):
    """Conversation for training"""
    messages: List[ConversationMessage]
    platform: Optional[str] = "unknown"
    timestamp: Optional[str] = None


class TrainingRequest(BaseModel):
    """Request to start model training"""
    org_id: str = Field(..., description="Organization ID")
    base_model: Optional[str] = Field(None, description="Base model to fine-tune")
    conversations: List[Conversation] = Field(..., description="Training conversations")
    validation_split: Optional[float] = Field(0.1, description="Validation split ratio")
    num_epochs: Optional[int] = Field(None, description="Number of training epochs")


class TrainingStatus(BaseModel):
    """Training job status"""
    training_id: str
    org_id: str
    status: str  # queued, running, completed, failed
    progress: Optional[float] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    error: Optional[str] = None
    metadata: Optional[Dict] = None


class EvaluationRequest(BaseModel):
    """Request to evaluate a model"""
    org_id: str
    model_id: str = "latest"
    test_prompts: Optional[List[Dict[str, str]]] = None


@router.post("/start", response_model=TrainingStatus)
async def start_training(
    request: TrainingRequest,
    background_tasks: BackgroundTasks,
):
    """
    Start a new model training job

    This endpoint:
    1. Validates training data
    2. Prepares datasets
    3. Starts training in background
    4. Returns training job ID for tracking
    """
    try:
        # Generate training ID
        training_id = f"train_{uuid.uuid4().hex[:12]}"

        # Validate minimum samples
        total_messages = sum(len(conv.messages) for conv in request.conversations)
        if total_messages < settings.MIN_TRAINING_SAMPLES * 2:
            raise HTTPException(
                status_code=400,
                detail=f"Not enough training data. Need at least {settings.MIN_TRAINING_SAMPLES} conversations"
            )

        # Create training status
        training_status = {
            "training_id": training_id,
            "org_id": request.org_id,
            "status": "queued",
            "progress": 0.0,
            "started_at": None,
            "completed_at": None,
            "error": None,
            "metadata": None,
        }
        active_trainings[training_id] = training_status

        # Start training in background
        background_tasks.add_task(
            run_training_job,
            training_id=training_id,
            org_id=request.org_id,
            base_model=request.base_model or settings.DEFAULT_BASE_MODEL,
            conversations=[conv.dict() for conv in request.conversations],
            validation_split=request.validation_split,
            num_epochs=request.num_epochs,
        )

        logger.info(f"Training job {training_id} queued for org {request.org_id}")

        return TrainingStatus(**training_status)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to start training: {e}")
        raise HTTPException(status_code=500, detail=str(e))


async def run_training_job(
    training_id: str,
    org_id: str,
    base_model: str,
    conversations: List[Dict],
    validation_split: float,
    num_epochs: Optional[int],
):
    """
    Run training job in background

    This is the actual training logic that runs asynchronously
    """
    try:
        # Update status
        active_trainings[training_id]["status"] = "running"
        active_trainings[training_id]["started_at"] = datetime.utcnow().isoformat()

        logger.info(f"Starting training job {training_id}")

        # Initialize trainer
        trainer = ModelTrainer(base_model_name=base_model)

        # Load base model
        trainer.load_base_model(use_quantization=True)
        active_trainings[training_id]["progress"] = 0.1

        # Apply LoRA
        trainer.apply_lora()
        active_trainings[training_id]["progress"] = 0.2

        # Prepare dataset
        dataset_prep = DatasetPreparator(trainer.tokenizer)
        train_dataset, eval_dataset = dataset_prep.prepare_dataset(
            conversations=conversations,
            validation_split=validation_split,
        )
        active_trainings[training_id]["progress"] = 0.3

        # Override num_epochs if provided
        if num_epochs is not None:
            original_epochs = settings.NUM_TRAIN_EPOCHS
            settings.NUM_TRAIN_EPOCHS = num_epochs

        # Train model
        metadata = trainer.train(
            train_dataset=train_dataset,
            eval_dataset=eval_dataset,
            org_id=org_id,
            training_id=training_id,
        )

        # Restore original epochs
        if num_epochs is not None:
            settings.NUM_TRAIN_EPOCHS = original_epochs

        # Update status
        active_trainings[training_id]["status"] = "completed"
        active_trainings[training_id]["completed_at"] = datetime.utcnow().isoformat()
        active_trainings[training_id]["progress"] = 1.0
        active_trainings[training_id]["metadata"] = metadata

        logger.info(f"Training job {training_id} completed successfully")

    except Exception as e:
        logger.error(f"Training job {training_id} failed: {e}")
        active_trainings[training_id]["status"] = "failed"
        active_trainings[training_id]["error"] = str(e)
        active_trainings[training_id]["completed_at"] = datetime.utcnow().isoformat()


@router.get("/status/{training_id}", response_model=TrainingStatus)
async def get_training_status(training_id: str):
    """Get status of a training job"""
    if training_id not in active_trainings:
        raise HTTPException(status_code=404, detail="Training job not found")

    return TrainingStatus(**active_trainings[training_id])


@router.get("/jobs/{org_id}")
async def list_training_jobs(org_id: str):
    """List all training jobs for an organization"""
    jobs = [
        TrainingStatus(**job)
        for job in active_trainings.values()
        if job["org_id"] == org_id
    ]
    return {"jobs": jobs}


@router.post("/evaluate")
async def evaluate_model(request: EvaluationRequest):
    """
    Evaluate a fine-tuned model

    Returns metrics like perplexity and test responses
    """
    try:
        from pathlib import Path

        # Find model path
        model_dir = Path(settings.FINETUNED_MODEL_DIR) / request.org_id

        if request.model_id == "latest":
            model_dirs = sorted(model_dir.glob("*"), key=lambda p: p.stat().st_mtime, reverse=True)
            if not model_dirs:
                raise HTTPException(status_code=404, detail="No models found")
            model_path = str(model_dirs[0])
        else:
            model_path = str(model_dir / request.model_id)

        # Create evaluator
        evaluator = ModelEvaluator(model_path)

        # Run evaluation
        metrics = evaluator.evaluate_model(
            test_prompts=request.test_prompts,
        )

        return {
            "model_path": model_path,
            "metrics": metrics,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Evaluation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/jobs/{training_id}")
async def cancel_training(training_id: str):
    """Cancel a running training job"""
    if training_id not in active_trainings:
        raise HTTPException(status_code=404, detail="Training job not found")

    job = active_trainings[training_id]

    if job["status"] == "completed":
        raise HTTPException(status_code=400, detail="Cannot cancel completed job")

    if job["status"] == "failed":
        raise HTTPException(status_code=400, detail="Cannot cancel failed job")

    # TODO: Implement actual cancellation logic
    # For now, just mark as failed
    job["status"] = "cancelled"
    job["completed_at"] = datetime.utcnow().isoformat()

    return {"message": "Training job cancelled", "training_id": training_id}
