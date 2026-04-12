"""
Model Serving for Inference
"""
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from pathlib import Path
import logging
from typing import Dict, Optional
import json
from peft import PeftModel

from ..config import settings

logger = logging.getLogger(__name__)


class InferenceServer:
    """Serve fine-tuned models for inference"""

    def __init__(self):
        self.loaded_models: Dict[str, Dict] = {}  # org_id -> {model, tokenizer, metadata}

    def load_model(self, org_id: str, model_id: str = "latest") -> bool:
        """
        Load a fine-tuned model for an organization

        Args:
            org_id: Organization ID
            model_id: Model identifier (default: "latest")

        Returns:
            True if successful
        """
        try:
            # Find model path
            model_dir = Path(settings.FINETUNED_MODEL_DIR) / org_id

            if model_id == "latest":
                # Find latest model by timestamp
                model_dirs = sorted(model_dir.glob("*"), key=lambda p: p.stat().st_mtime, reverse=True)
                if not model_dirs:
                    logger.error(f"No models found for org {org_id}")
                    return False
                model_path = model_dirs[0]
            else:
                model_path = model_dir / model_id

            if not model_path.exists():
                logger.error(f"Model path does not exist: {model_path}")
                return False

            logger.info(f"Loading model for org {org_id} from {model_path}")

            # Load metadata
            metadata_path = model_path / "training_metadata.json"
            if metadata_path.exists():
                with open(metadata_path, "r") as f:
                    metadata = json.load(f)
            else:
                metadata = {}

            # Load tokenizer
            tokenizer = AutoTokenizer.from_pretrained(str(model_path))

            # Check if this is a PEFT model (LoRA)
            adapter_config_path = model_path / "adapter_config.json"
            is_peft_model = adapter_config_path.exists()

            if is_peft_model:
                # Load base model first
                base_model_name = metadata.get("base_model", settings.DEFAULT_BASE_MODEL)
                logger.info(f"Loading base model: {base_model_name}")

                base_model = AutoModelForCausalLM.from_pretrained(
                    base_model_name,
                    device_map="auto",
                    torch_dtype=torch.float16,
                    token=settings.HUGGINGFACE_TOKEN,
                )

                # Load PEFT adapters
                model = PeftModel.from_pretrained(base_model, str(model_path))
                model = model.merge_and_unload()  # Merge for faster inference
            else:
                # Load full fine-tuned model
                model = AutoModelForCausalLM.from_pretrained(
                    str(model_path),
                    device_map="auto",
                    torch_dtype=torch.float16,
                )

            model.eval()

            # Store in cache
            self.loaded_models[org_id] = {
                "model": model,
                "tokenizer": tokenizer,
                "metadata": metadata,
                "model_path": str(model_path),
            }

            logger.info(f"Model loaded successfully for org {org_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to load model for org {org_id}: {e}")
            return False

    def unload_model(self, org_id: str):
        """Unload a model from memory"""
        if org_id in self.loaded_models:
            del self.loaded_models[org_id]
            torch.cuda.empty_cache()
            logger.info(f"Model unloaded for org {org_id}")

    def generate(
        self,
        org_id: str,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_new_tokens: int = None,
        temperature: float = None,
        top_p: float = None,
        top_k: int = None,
    ) -> Optional[str]:
        """
        Generate text using a fine-tuned model

        Args:
            org_id: Organization ID
            prompt: User prompt
            system_prompt: Optional system prompt
            max_new_tokens: Max tokens to generate
            temperature: Sampling temperature
            top_p: Nucleus sampling threshold
            top_k: Top-k sampling

        Returns:
            Generated text or None if failed
        """
        # Load model if not already loaded
        if org_id not in self.loaded_models:
            success = self.load_model(org_id)
            if not success:
                return None

        model_data = self.loaded_models[org_id]
        model = model_data["model"]
        tokenizer = model_data["tokenizer"]

        # Use defaults if not provided
        max_new_tokens = max_new_tokens or settings.MAX_NEW_TOKENS
        temperature = temperature or settings.TEMPERATURE
        top_p = top_p or settings.TOP_P
        top_k = top_k or settings.TOP_K

        # Format prompt
        if system_prompt:
            formatted_prompt = f"""{system_prompt}

### Instruction:
{prompt}

### Response:
"""
        else:
            formatted_prompt = f"""Below is an instruction that describes a task. Write a response that appropriately completes the request.

### Instruction:
{prompt}

### Response:
"""

        try:
            # Tokenize
            inputs = tokenizer(formatted_prompt, return_tensors="pt").to(model.device)

            # Generate
            with torch.no_grad():
                outputs = model.generate(
                    **inputs,
                    max_new_tokens=max_new_tokens,
                    temperature=temperature,
                    top_p=top_p,
                    top_k=top_k,
                    do_sample=True,
                    pad_token_id=tokenizer.eos_token_id,
                )

            # Decode
            generated_text = tokenizer.decode(outputs[0], skip_special_tokens=True)

            # Remove prompt from output
            response = generated_text[len(formatted_prompt):].strip()

            return response

        except Exception as e:
            logger.error(f"Generation failed for org {org_id}: {e}")
            return None

    def get_model_info(self, org_id: str) -> Optional[Dict]:
        """Get information about a loaded model"""
        if org_id not in self.loaded_models:
            return None

        model_data = self.loaded_models[org_id]
        return {
            "org_id": org_id,
            "model_path": model_data["model_path"],
            "metadata": model_data["metadata"],
            "loaded": True,
        }

    def list_available_models(self, org_id: str) -> list:
        """List all available models for an organization"""
        model_dir = Path(settings.FINETUNED_MODEL_DIR) / org_id

        if not model_dir.exists():
            return []

        models = []
        for model_path in sorted(model_dir.glob("*"), key=lambda p: p.stat().st_mtime, reverse=True):
            if model_path.is_dir():
                metadata_path = model_path / "training_metadata.json"
                if metadata_path.exists():
                    with open(metadata_path, "r") as f:
                        metadata = json.load(f)
                else:
                    metadata = {}

                models.append({
                    "model_id": model_path.name,
                    "created_at": model_path.stat().st_mtime,
                    "metadata": metadata,
                })

        return models


# Global inference server instance
inference_server = InferenceServer()
