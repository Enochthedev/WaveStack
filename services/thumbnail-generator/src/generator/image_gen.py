"""
AI Image Generation for Thumbnails
"""
import logging
from typing import Optional
from pathlib import Path
import httpx
from PIL import Image
import io

from ..config import settings

logger = logging.getLogger(__name__)


class ImageGenerator:
    """Generate images using various AI providers"""

    def __init__(self):
        self.openai_client = None
        self.stability_client = None
        self.sd_pipeline = None
        self.provider = settings.IMAGE_PROVIDER

    async def initialize(self):
        """Initialize the selected image generation provider"""
        if self.provider == "openai":
            await self._init_openai()
        elif self.provider == "stability":
            await self._init_stability()
        elif self.provider == "local":
            await self._init_local_sd()
        else:
            raise ValueError(f"Unknown image provider: {self.provider}")

    async def _init_openai(self):
        """Initialize OpenAI DALL-E"""
        if not settings.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY required for DALL-E")

        from openai import AsyncOpenAI
        self.openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        logger.info("✅ DALL-E initialized")

    async def _init_stability(self):
        """Initialize Stability AI"""
        if not settings.STABILITY_API_KEY:
            raise ValueError("STABILITY_API_KEY required for Stability AI")

        self.stability_client = httpx.AsyncClient(
            base_url="https://api.stability.ai",
            headers={"Authorization": f"Bearer {settings.STABILITY_API_KEY}"},
            timeout=60.0,
        )
        logger.info("✅ Stability AI initialized")

    async def _init_local_sd(self):
        """Initialize local Stable Diffusion"""
        logger.info("Loading Stable Diffusion model (this may take a while)...")

        from diffusers import DiffusionPipeline, AutoencoderKL
        import torch

        # Use SDXL for better quality
        vae = AutoencoderKL.from_pretrained(
            "madebyollin/sdxl-vae-fp16-fix",
            torch_dtype=torch.float16
        )

        self.sd_pipeline = DiffusionPipeline.from_pretrained(
            settings.SD_MODEL,
            vae=vae,
            torch_dtype=torch.float16,
            cache_dir=settings.SD_CACHE_DIR,
            use_safetensors=True,
        )

        # Move to GPU if available
        if torch.cuda.is_available():
            self.sd_pipeline = self.sd_pipeline.to("cuda")
            logger.info("Using CUDA for Stable Diffusion")
        else:
            logger.warning("CUDA not available - using CPU (slower)")

        # Enable memory optimizations
        self.sd_pipeline.enable_attention_slicing()

        logger.info("✅ Stable Diffusion initialized")

    async def generate_image(
        self,
        prompt: str,
        negative_prompt: Optional[str] = None,
        style: Optional[str] = None,
    ) -> Image.Image:
        """
        Generate an image from a text prompt

        Args:
            prompt: Description of the image
            negative_prompt: What to avoid in the image
            style: Style preset (e.g., "dramatic", "colorful", "minimalist")

        Returns:
            PIL Image
        """
        # Enhance prompt with style if provided
        if style:
            prompt = self._apply_style(prompt, style)

        if self.provider == "openai":
            return await self._generate_dalle(prompt)
        elif self.provider == "stability":
            return await self._generate_stability(prompt, negative_prompt)
        elif self.provider == "local":
            return await self._generate_local(prompt, negative_prompt)
        else:
            raise ValueError(f"Unknown provider: {self.provider}")

    def _apply_style(self, prompt: str, style: str) -> str:
        """Apply style modifiers to prompt"""
        style_modifiers = {
            "dramatic": ", dramatic lighting, high contrast, cinematic",
            "colorful": ", vibrant colors, saturated, eye-catching",
            "minimalist": ", clean, simple, minimal design",
            "gaming": ", gaming aesthetic, neon colors, action-packed",
            "tech": ", futuristic, tech-inspired, modern design",
            "professional": ", professional, clean, high-quality",
            "fun": ", playful, energetic, fun atmosphere",
            "dark": ", dark theme, moody lighting, dramatic shadows",
        }

        modifier = style_modifiers.get(style.lower(), "")
        return f"{prompt}{modifier}"

    async def _generate_dalle(self, prompt: str) -> Image.Image:
        """Generate image using DALL-E"""
        logger.info(f"Generating with DALL-E: {prompt[:100]}...")

        response = await self.openai_client.images.generate(
            model=settings.DALLE_MODEL,
            prompt=prompt,
            size=settings.DALLE_SIZE,
            quality=settings.DALLE_QUALITY,
            n=1,
        )

        # Download image
        image_url = response.data[0].url
        async with httpx.AsyncClient() as client:
            img_response = await client.get(image_url)
            img_response.raise_for_status()
            image = Image.open(io.BytesIO(img_response.content))

        logger.info("✅ DALL-E generation complete")
        return image

    async def _generate_stability(
        self,
        prompt: str,
        negative_prompt: Optional[str] = None,
    ) -> Image.Image:
        """Generate image using Stability AI"""
        logger.info(f"Generating with Stability AI: {prompt[:100]}...")

        # Build request
        data = {
            "text_prompts": [
                {"text": prompt, "weight": 1},
            ],
            "cfg_scale": 7,
            "height": settings.THUMBNAIL_HEIGHT,
            "width": settings.THUMBNAIL_WIDTH,
            "samples": 1,
            "steps": 30,
        }

        if negative_prompt:
            data["text_prompts"].append({"text": negative_prompt, "weight": -1})

        response = await self.stability_client.post(
            f"/v1/generation/{settings.STABILITY_MODEL}/text-to-image",
            json=data,
        )
        response.raise_for_status()

        # Extract image
        result = response.json()
        image_data = result["artifacts"][0]["base64"]

        import base64
        image_bytes = base64.b64decode(image_data)
        image = Image.open(io.BytesIO(image_bytes))

        logger.info("✅ Stability AI generation complete")
        return image

    async def _generate_local(
        self,
        prompt: str,
        negative_prompt: Optional[str] = None,
    ) -> Image.Image:
        """Generate image using local Stable Diffusion"""
        logger.info(f"Generating with Stable Diffusion: {prompt[:100]}...")

        import asyncio

        # Run in thread pool (CPU-bound)
        loop = asyncio.get_event_loop()

        def generate():
            result = self.sd_pipeline(
                prompt=prompt,
                negative_prompt=negative_prompt or "blurry, bad quality, distorted",
                num_inference_steps=30,
                guidance_scale=7.5,
                height=settings.THUMBNAIL_HEIGHT,
                width=settings.THUMBNAIL_WIDTH,
            )
            return result.images[0]

        image = await loop.run_in_executor(None, generate)

        logger.info("✅ Stable Diffusion generation complete")
        return image

    async def generate_from_video_metadata(
        self,
        title: str,
        description: Optional[str] = None,
        tags: Optional[list] = None,
        style: Optional[str] = None,
    ) -> Image.Image:
        """
        Generate thumbnail from video metadata

        Uses AI personality service to create an optimized prompt
        """
        if settings.USE_AI_PROMPTS:
            prompt = await self._generate_ai_prompt(title, description, tags)
        else:
            prompt = self._generate_simple_prompt(title, tags)

        return await self.generate_image(prompt, style=style)

    async def _generate_ai_prompt(
        self,
        title: str,
        description: Optional[str] = None,
        tags: Optional[list] = None,
    ) -> str:
        """Use AI personality to create an optimized image generation prompt"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{settings.AI_PERSONALITY_URL}/api/v1/chat",
                    json={
                        "message": f"Create a detailed image generation prompt for a YouTube thumbnail. Video title: '{title}'. Description: '{description or 'N/A'}'. Tags: {tags or []}. Focus on eye-catching visual elements.",
                        "platform": "thumbnail-generator",
                    },
                    timeout=10.0,
                )

                if response.status_code == 200:
                    result = response.json()
                    ai_prompt = result.get("response", "")
                    logger.info(f"AI-generated prompt: {ai_prompt}")
                    return ai_prompt

        except Exception as e:
            logger.warning(f"Failed to get AI prompt: {e}, using simple prompt")

        return self._generate_simple_prompt(title, tags)

    def _generate_simple_prompt(
        self,
        title: str,
        tags: Optional[list] = None,
    ) -> str:
        """Generate a simple prompt from title and tags"""
        prompt = f"YouTube thumbnail for '{title}'"

        if tags:
            prompt += f", featuring {', '.join(tags[:3])}"

        prompt += ", professional, high-quality, eye-catching"

        return prompt


# Global instance
image_generator = ImageGenerator()
