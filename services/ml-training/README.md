# ML Training Service

Fine-tune and serve custom language models for AI personality.

## Features

- **LoRA/QLoRA Fine-Tuning** - Parameter-efficient fine-tuning with 4-bit/8-bit quantization
- **Multiple Base Models** - Support for Llama 2, Mistral, and other HuggingFace models
- **Automatic Dataset Preparation** - Convert conversation history into training data
- **Model Evaluation** - Calculate perplexity and test model responses
- **Inference Serving** - Serve fine-tuned models via REST API
- **GPU Optimization** - CUDA support with memory-efficient training

## Requirements

### Hardware

- **GPU**: NVIDIA GPU with at least 8GB VRAM (16GB+ recommended)
  - RTX 3060 (12GB) - Minimum
  - RTX 3090 (24GB) - Recommended
  - RTX 4090 (24GB) - Optimal
- **RAM**: 16GB+ system RAM
- **Storage**: 50GB+ for models and checkpoints

### Software

- Docker with NVIDIA Container Toolkit
- CUDA 12.1+
- Python 3.11 (if running locally)

## Quick Start

### 1. Setup Environment

```bash
cd services/ml-training
cp .env.example .env
```

Edit `.env` and configure:
- `HUGGINGFACE_TOKEN` - Optional, for gated models like Llama 2
- `DEFAULT_BASE_MODEL` - Base model to fine-tune

### 2. Run with Docker

```bash
docker build -t wavestack-ml-training .
docker run --gpus all -p 8300:8300 \
  -v $(pwd)/models:/app/models \
  wavestack-ml-training
```

### 3. Start Training

```bash
curl -X POST http://localhost:8300/api/v1/training/start \
  -H "Content-Type: application/json" \
  -d '{
    "org_id": "org_123",
    "base_model": "meta-llama/Llama-2-7b-chat-hf",
    "conversations": [
      {
        "messages": [
          {"role": "user", "content": "Hello!"},
          {"role": "assistant", "content": "Hey! How are you?"}
        ],
        "platform": "discord"
      }
    ]
  }'
```

Response:
```json
{
  "training_id": "train_abc123",
  "org_id": "org_123",
  "status": "queued",
  "progress": 0.0
}
```

### 4. Check Training Status

```bash
curl http://localhost:8300/api/v1/training/status/train_abc123
```

### 5. Use Fine-Tuned Model

```bash
curl -X POST "http://localhost:8300/api/v1/generate?org_id=org_123" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Tell me a joke",
    "temperature": 0.8,
    "max_tokens": 100
  }'
```

## API Endpoints

### Training

- `POST /api/v1/training/start` - Start training job
- `GET /api/v1/training/status/{training_id}` - Check training status
- `GET /api/v1/training/jobs/{org_id}` - List training jobs
- `POST /api/v1/training/evaluate` - Evaluate model
- `DELETE /api/v1/training/jobs/{training_id}` - Cancel training

### Inference

- `POST /api/v1/generate` - Generate text (main endpoint)
- `POST /api/v1/models/load` - Manually load model
- `POST /api/v1/models/unload` - Unload model from memory
- `GET /api/v1/models/{org_id}/info` - Get model info
- `GET /api/v1/models/{org_id}/list` - List available models
- `GET /api/v1/health` - Health check

## Training Configuration

### LoRA Parameters

Configured in `.env`:

```env
LORA_R=16              # LoRA rank (higher = more parameters)
LORA_ALPHA=32          # LoRA alpha scaling
LORA_DROPOUT=0.05      # Dropout rate
LORA_TARGET_MODULES=q_proj,v_proj  # Which layers to apply LoRA
```

### Training Hyperparameters

```env
BATCH_SIZE=4                      # Batch size per GPU
GRADIENT_ACCUMULATION_STEPS=4     # Effective batch = 4 * 4 = 16
LEARNING_RATE=0.0002              # Learning rate
NUM_TRAIN_EPOCHS=3                # Number of epochs
```

### Quantization

```env
USE_4BIT=true          # 4-bit quantization (QLoRA)
USE_8BIT=false         # 8-bit quantization
```

**Memory Usage:**
- Full precision (fp32): ~28GB VRAM for 7B model
- Half precision (fp16): ~14GB VRAM
- 8-bit quantization: ~7GB VRAM
- 4-bit quantization (QLoRA): ~4GB VRAM ✅

## Integration with AI Personality Service

The AI personality service can use fine-tuned models by setting:

```env
# In services/ai-personality/.env
AI_PROVIDER=local
ML_TRAINING_URL=http://ml-training:8300
```

The personality engine will automatically call this service for inference.

## Model Storage

Models are stored in:
- `./models/cache` - Downloaded base models
- `./models/finetuned/{org_id}/{training_id}` - Fine-tuned models
- `./models/checkpoints` - Training checkpoints

## GPU Memory Optimization

For limited VRAM, try:

1. **Enable 4-bit quantization** (default)
2. **Reduce batch size**: `BATCH_SIZE=2` or `1`
3. **Reduce sequence length**: `MAX_SEQ_LENGTH=1024`
4. **Use gradient checkpointing** (already enabled)
5. **Use smaller base model**: `TinyLlama/TinyLlama-1.1B-Chat-v1.0`

## Monitoring

Training metrics are logged to TensorBoard:

```bash
tensorboard --logdir ./models/finetuned/{org_id}/{training_id}
```

## Troubleshooting

### Out of Memory (OOM)

- Reduce `BATCH_SIZE` to 2 or 1
- Reduce `MAX_SEQ_LENGTH` to 1024
- Enable 4-bit quantization: `USE_4BIT=true`
- Use a smaller base model

### Slow Training

- Training on CPU is very slow - GPU required
- Check GPU utilization: `nvidia-smi`
- Increase `BATCH_SIZE` if you have VRAM headroom

### Model Not Loading

- Check `HUGGINGFACE_TOKEN` for gated models
- Verify model name is correct
- Check disk space for model downloads

## Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run locally
python -m src.main

# Run tests (TODO)
pytest
```

## License

MIT
