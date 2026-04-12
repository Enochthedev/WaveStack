"""
Model Evaluation and Metrics
"""
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from datasets import Dataset
from typing import Dict, Any, List
import numpy as np
from pathlib import Path
import logging
import json

logger = logging.getLogger(__name__)


class ModelEvaluator:
    """Evaluate fine-tuned models"""

    def __init__(self, model_path: str):
        self.model_path = Path(model_path)
        self.model = None
        self.tokenizer = None

    def load_model(self):
        """Load model for evaluation"""
        logger.info(f"Loading model from {self.model_path}")

        self.tokenizer = AutoTokenizer.from_pretrained(str(self.model_path))
        self.model = AutoModelForCausalLM.from_pretrained(
            str(self.model_path),
            device_map="auto",
            torch_dtype=torch.float16,
        )
        self.model.eval()

    def calculate_perplexity(self, dataset: Dataset) -> float:
        """
        Calculate perplexity on a dataset
        Lower is better - measures how well model predicts the text
        """
        if self.model is None:
            self.load_model()

        total_loss = 0
        total_tokens = 0

        with torch.no_grad():
            for example in dataset:
                inputs = self.tokenizer(
                    example["text"],
                    return_tensors="pt",
                    truncation=True,
                    max_length=2048,
                ).to(self.model.device)

                outputs = self.model(**inputs, labels=inputs["input_ids"])
                loss = outputs.loss

                total_loss += loss.item() * inputs["input_ids"].size(1)
                total_tokens += inputs["input_ids"].size(1)

        avg_loss = total_loss / total_tokens
        perplexity = np.exp(avg_loss)

        return float(perplexity)

    def evaluate_responses(
        self,
        test_prompts: List[Dict[str, str]],
        max_new_tokens: int = 100,
    ) -> List[Dict[str, Any]]:
        """
        Generate responses for test prompts and return them for review

        Args:
            test_prompts: List of dicts with 'instruction' and optionally 'expected_response'
            max_new_tokens: Max tokens to generate

        Returns:
            List of evaluation results
        """
        if self.model is None:
            self.load_model()

        results = []

        for prompt_data in test_prompts:
            instruction = prompt_data["instruction"]
            expected = prompt_data.get("expected_response")

            # Format as instruction prompt
            formatted_prompt = f"""Below is an instruction that describes a task. Write a response that appropriately completes the request.

### Instruction:
{instruction}

### Response:
"""

            # Generate
            inputs = self.tokenizer(formatted_prompt, return_tensors="pt").to(self.model.device)

            with torch.no_grad():
                outputs = self.model.generate(
                    **inputs,
                    max_new_tokens=max_new_tokens,
                    temperature=0.8,
                    top_p=0.9,
                    do_sample=True,
                    pad_token_id=self.tokenizer.eos_token_id,
                )

            generated = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
            response = generated[len(formatted_prompt):].strip()

            result = {
                "instruction": instruction,
                "generated_response": response,
            }

            if expected:
                result["expected_response"] = expected

            results.append(result)

        return results

    def evaluate_model(
        self,
        eval_dataset: Dataset = None,
        test_prompts: List[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """
        Comprehensive model evaluation

        Returns:
            Dictionary with evaluation metrics
        """
        metrics = {}

        # Calculate perplexity if dataset provided
        if eval_dataset is not None:
            try:
                perplexity = self.calculate_perplexity(eval_dataset)
                metrics["perplexity"] = perplexity
                logger.info(f"Perplexity: {perplexity:.2f}")
            except Exception as e:
                logger.error(f"Failed to calculate perplexity: {e}")
                metrics["perplexity"] = None

        # Generate test responses if prompts provided
        if test_prompts is not None:
            try:
                responses = self.evaluate_responses(test_prompts)
                metrics["test_responses"] = responses
                logger.info(f"Generated {len(responses)} test responses")
            except Exception as e:
                logger.error(f"Failed to generate test responses: {e}")
                metrics["test_responses"] = []

        # Model size metrics
        try:
            num_parameters = sum(p.numel() for p in self.model.parameters())
            trainable_parameters = sum(
                p.numel() for p in self.model.parameters() if p.requires_grad
            )

            metrics["total_parameters"] = num_parameters
            metrics["trainable_parameters"] = trainable_parameters
            metrics["model_size_mb"] = (num_parameters * 2) / (1024 ** 2)  # Assuming fp16

            logger.info(f"Total parameters: {num_parameters:,}")
            logger.info(f"Trainable parameters: {trainable_parameters:,}")
        except Exception as e:
            logger.error(f"Failed to calculate model size: {e}")

        return metrics

    def save_evaluation_report(self, metrics: Dict[str, Any], output_path: str):
        """Save evaluation report to file"""
        output_file = Path(output_path)
        output_file.parent.mkdir(parents=True, exist_ok=True)

        with open(output_file, "w") as f:
            json.dump(metrics, f, indent=2)

        logger.info(f"Evaluation report saved to {output_path}")


def compare_models(
    model_paths: List[str],
    eval_dataset: Dataset,
    test_prompts: List[Dict[str, str]] = None,
) -> Dict[str, Any]:
    """
    Compare multiple models on the same evaluation set

    Returns:
        Comparison metrics for all models
    """
    comparison = {}

    for model_path in model_paths:
        logger.info(f"Evaluating model: {model_path}")

        evaluator = ModelEvaluator(model_path)
        metrics = evaluator.evaluate_model(
            eval_dataset=eval_dataset,
            test_prompts=test_prompts,
        )

        comparison[model_path] = metrics

    return comparison
