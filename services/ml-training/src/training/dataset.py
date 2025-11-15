"""
Dataset Preparation for Fine-Tuning
"""
import json
from typing import List, Dict, Any
from datasets import Dataset
from transformers import AutoTokenizer
from pathlib import Path
import logging

from ..config import settings

logger = logging.getLogger(__name__)


class DatasetPreparator:
    """Prepare training datasets from conversation history"""

    def __init__(self, tokenizer: AutoTokenizer):
        self.tokenizer = tokenizer
        self.max_seq_length = settings.MAX_SEQ_LENGTH

    def prepare_from_conversations(
        self, conversations: List[Dict[str, Any]]
    ) -> Dataset:
        """
        Convert conversation history into training dataset

        Args:
            conversations: List of conversation dicts with 'messages' field

        Returns:
            Hugging Face Dataset ready for training
        """
        training_examples = []

        for conv in conversations:
            messages = conv.get("messages", [])
            if len(messages) < 2:
                continue

            # Format as instruction-response pairs
            for i in range(len(messages) - 1):
                if messages[i]["role"] == "user" and messages[i + 1]["role"] == "assistant":
                    training_examples.append({
                        "instruction": messages[i]["content"],
                        "response": messages[i + 1]["content"],
                        "platform": conv.get("platform", "unknown"),
                        "timestamp": conv.get("timestamp", ""),
                    })

        logger.info(f"Created {len(training_examples)} training examples from conversations")

        if len(training_examples) < settings.MIN_TRAINING_SAMPLES:
            raise ValueError(
                f"Not enough training samples. Got {len(training_examples)}, "
                f"need at least {settings.MIN_TRAINING_SAMPLES}"
            )

        return Dataset.from_list(training_examples)

    def format_instruction(self, example: Dict[str, Any]) -> Dict[str, str]:
        """
        Format example as instruction-following prompt

        Using Alpaca-style format:
        Below is an instruction... ### Instruction: ... ### Response: ...
        """
        prompt = f"""Below is an instruction that describes a task. Write a response that appropriately completes the request.

### Instruction:
{example['instruction']}

### Response:
{example['response']}"""

        return {"text": prompt}

    def tokenize_function(self, examples: Dict[str, List]) -> Dict[str, Any]:
        """Tokenize examples for training"""
        # Format all examples
        formatted = [self.format_instruction({"instruction": inst, "response": resp})
                     for inst, resp in zip(examples["instruction"], examples["response"])]

        texts = [f["text"] for f in formatted]

        # Tokenize
        tokenized = self.tokenizer(
            texts,
            truncation=True,
            max_length=self.max_seq_length,
            padding="max_length",
            return_tensors=None,
        )

        # For causal LM, labels are the same as input_ids
        tokenized["labels"] = tokenized["input_ids"].copy()

        return tokenized

    def prepare_dataset(
        self,
        conversations: List[Dict[str, Any]],
        validation_split: float = None
    ) -> tuple[Dataset, Dataset]:
        """
        Prepare train and validation datasets

        Returns:
            (train_dataset, validation_dataset)
        """
        if validation_split is None:
            validation_split = settings.VALIDATION_SPLIT

        # Create base dataset
        dataset = self.prepare_from_conversations(conversations)

        # Tokenize
        tokenized_dataset = dataset.map(
            self.tokenize_function,
            batched=True,
            remove_columns=dataset.column_names,
            desc="Tokenizing dataset",
        )

        # Split into train/validation
        split_dataset = tokenized_dataset.train_test_split(
            test_size=validation_split,
            seed=42
        )

        train_dataset = split_dataset["train"]
        val_dataset = split_dataset["test"]

        logger.info(f"Prepared {len(train_dataset)} training samples, {len(val_dataset)} validation samples")

        return train_dataset, val_dataset

    def save_dataset(self, dataset: Dataset, output_path: str):
        """Save prepared dataset to disk"""
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        dataset.save_to_disk(output_path)
        logger.info(f"Saved dataset to {output_path}")

    def load_dataset(self, input_path: str) -> Dataset:
        """Load prepared dataset from disk"""
        from datasets import load_from_disk
        dataset = load_from_disk(input_path)
        logger.info(f"Loaded dataset from {input_path}")
        return dataset
