"""
Model Fine-Tuning with LoRA/QLoRA
"""
import torch
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    TrainingArguments,
    Trainer,
    BitsAndBytesConfig,
)
from peft import (
    LoraConfig,
    get_peft_model,
    prepare_model_for_kbit_training,
    PeftModel,
)
from datasets import Dataset
from pathlib import Path
import logging
from typing import Optional, Dict, Any
import json

from ..config import settings

logger = logging.getLogger(__name__)


class ModelTrainer:
    """Fine-tune language models with LoRA/QLoRA"""

    def __init__(
        self,
        base_model_name: str = None,
        output_dir: str = None,
    ):
        self.base_model_name = base_model_name or settings.DEFAULT_BASE_MODEL
        self.output_dir = output_dir or settings.FINETUNED_MODEL_DIR
        self.model = None
        self.tokenizer = None
        self.trainer = None

    def load_base_model(self, use_quantization: bool = True):
        """Load base model with optional quantization"""
        logger.info(f"Loading base model: {self.base_model_name}")

        # Load tokenizer
        self.tokenizer = AutoTokenizer.from_pretrained(
            self.base_model_name,
            trust_remote_code=True,
            token=settings.HUGGINGFACE_TOKEN,
        )
        self.tokenizer.pad_token = self.tokenizer.eos_token
        self.tokenizer.padding_side = "right"

        # Quantization config for QLoRA
        quantization_config = None
        if use_quantization:
            if settings.USE_4BIT:
                quantization_config = BitsAndBytesConfig(
                    load_in_4bit=True,
                    bnb_4bit_compute_dtype=getattr(torch, settings.BNB_4BIT_COMPUTE_DTYPE),
                    bnb_4bit_quant_type=settings.BNB_4BIT_QUANT_TYPE,
                    bnb_4bit_use_double_quant=True,
                )
                logger.info("Using 4-bit quantization (QLoRA)")
            elif settings.USE_8BIT:
                quantization_config = BitsAndBytesConfig(
                    load_in_8bit=True,
                )
                logger.info("Using 8-bit quantization")

        # Load model
        self.model = AutoModelForCausalLM.from_pretrained(
            self.base_model_name,
            quantization_config=quantization_config,
            device_map="auto",
            trust_remote_code=True,
            token=settings.HUGGINGFACE_TOKEN,
            torch_dtype=torch.float16,
        )

        # Prepare model for k-bit training if quantized
        if use_quantization:
            self.model = prepare_model_for_kbit_training(self.model)

        logger.info("Base model loaded successfully")

    def apply_lora(self):
        """Apply LoRA adapters to model"""
        logger.info("Applying LoRA configuration")

        # LoRA config
        lora_config = LoraConfig(
            r=settings.LORA_R,
            lora_alpha=settings.LORA_ALPHA,
            target_modules=settings.LORA_TARGET_MODULES.split(","),
            lora_dropout=settings.LORA_DROPOUT,
            bias="none",
            task_type="CAUSAL_LM",
        )

        # Apply LoRA
        self.model = get_peft_model(self.model, lora_config)
        self.model.print_trainable_parameters()

        logger.info("LoRA applied successfully")

    def train(
        self,
        train_dataset: Dataset,
        eval_dataset: Dataset,
        org_id: str,
        training_id: str,
    ) -> Dict[str, Any]:
        """
        Fine-tune model on prepared dataset

        Args:
            train_dataset: Training data
            eval_dataset: Validation data
            org_id: Organization ID
            training_id: Unique training job ID

        Returns:
            Training metrics and model info
        """
        if self.model is None or self.tokenizer is None:
            raise ValueError("Model not loaded. Call load_base_model() first")

        # Setup output directory
        output_path = Path(self.output_dir) / org_id / training_id
        output_path.mkdir(parents=True, exist_ok=True)

        # Training arguments
        training_args = TrainingArguments(
            output_dir=str(output_path),
            per_device_train_batch_size=settings.BATCH_SIZE,
            gradient_accumulation_steps=settings.GRADIENT_ACCUMULATION_STEPS,
            learning_rate=settings.LEARNING_RATE,
            num_train_epochs=settings.NUM_TRAIN_EPOCHS,
            warmup_steps=settings.WARMUP_STEPS,
            logging_steps=settings.LOGGING_STEPS,
            save_steps=settings.SAVE_STEPS,
            eval_steps=settings.EVAL_STEPS,
            evaluation_strategy="steps",
            save_strategy="steps",
            load_best_model_at_end=True,
            fp16=True,
            optim="paged_adamw_8bit",  # Memory-efficient optimizer
            lr_scheduler_type="cosine",
            max_grad_norm=0.3,
            group_by_length=True,
            report_to="tensorboard",
            run_name=f"wavestack-{training_id}",
        )

        # Create trainer
        self.trainer = Trainer(
            model=self.model,
            args=training_args,
            train_dataset=train_dataset,
            eval_dataset=eval_dataset,
        )

        # Train
        logger.info(f"Starting training job: {training_id}")
        train_result = self.trainer.train()

        # Save final model
        self.trainer.save_model()
        self.tokenizer.save_pretrained(str(output_path))

        # Save training metadata
        metadata = {
            "base_model": self.base_model_name,
            "org_id": org_id,
            "training_id": training_id,
            "num_train_samples": len(train_dataset),
            "num_eval_samples": len(eval_dataset),
            "train_loss": train_result.training_loss,
            "train_runtime": train_result.metrics["train_runtime"],
            "train_samples_per_second": train_result.metrics["train_samples_per_second"],
            "lora_config": {
                "r": settings.LORA_R,
                "alpha": settings.LORA_ALPHA,
                "dropout": settings.LORA_DROPOUT,
                "target_modules": settings.LORA_TARGET_MODULES,
            },
        }

        with open(output_path / "training_metadata.json", "w") as f:
            json.dump(metadata, f, indent=2)

        logger.info(f"Training completed. Model saved to {output_path}")

        return metadata

    def load_finetuned_model(self, model_path: str):
        """Load a fine-tuned model for inference"""
        logger.info(f"Loading fine-tuned model from {model_path}")

        # Load metadata
        with open(Path(model_path) / "training_metadata.json", "r") as f:
            metadata = json.load(f)

        base_model_name = metadata["base_model"]

        # Load base model
        self.tokenizer = AutoTokenizer.from_pretrained(model_path)
        base_model = AutoModelForCausalLM.from_pretrained(
            base_model_name,
            device_map="auto",
            torch_dtype=torch.float16,
            token=settings.HUGGINGFACE_TOKEN,
        )

        # Load LoRA weights
        self.model = PeftModel.from_pretrained(base_model, model_path)
        self.model = self.model.merge_and_unload()  # Merge LoRA weights for faster inference

        logger.info("Fine-tuned model loaded successfully")

    def generate(
        self,
        prompt: str,
        max_new_tokens: int = None,
        temperature: float = None,
        top_p: float = None,
        top_k: int = None,
    ) -> str:
        """Generate text from fine-tuned model"""
        if self.model is None:
            raise ValueError("Model not loaded")

        max_new_tokens = max_new_tokens or settings.MAX_NEW_TOKENS
        temperature = temperature or settings.TEMPERATURE
        top_p = top_p or settings.TOP_P
        top_k = top_k or settings.TOP_K

        # Tokenize input
        inputs = self.tokenizer(prompt, return_tensors="pt").to(self.model.device)

        # Generate
        with torch.no_grad():
            outputs = self.model.generate(
                **inputs,
                max_new_tokens=max_new_tokens,
                temperature=temperature,
                top_p=top_p,
                top_k=top_k,
                do_sample=True,
                pad_token_id=self.tokenizer.eos_token_id,
            )

        # Decode
        generated_text = self.tokenizer.decode(outputs[0], skip_special_tokens=True)

        # Remove the input prompt from output
        response = generated_text[len(prompt):].strip()

        return response
