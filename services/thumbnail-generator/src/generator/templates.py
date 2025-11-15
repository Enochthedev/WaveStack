"""
Thumbnail Templates
Pre-designed thumbnail styles
"""
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
import logging
from typing import Optional
from .text_overlay import text_overlay
from ..config import settings

logger = logging.getLogger(__name__)


class ThumbnailTemplates:
    """Pre-designed thumbnail templates"""

    def apply_template(
        self,
        base_image: Image.Image,
        template_name: str,
        title: str,
        subtitle: Optional[str] = None,
        **kwargs,
    ) -> Image.Image:
        """
        Apply a template to a base image

        Args:
            base_image: Background image
            template_name: Template to apply
            title: Main title text
            subtitle: Optional subtitle
            **kwargs: Additional template options

        Returns:
            Styled thumbnail image
        """
        templates = {
            "bold": self.bold_template,
            "dramatic": self.dramatic_template,
            "colorful": self.colorful_template,
            "minimal": self.minimal_template,
            "gaming": self.gaming_template,
            "split": self.split_template,
            "gradient": self.gradient_template,
            "vlog": self.vlog_template,
        }

        template_func = templates.get(template_name.lower())
        if not template_func:
            logger.warning(f"Unknown template: {template_name}, using bold")
            template_func = self.bold_template

        return template_func(base_image, title, subtitle, **kwargs)

    def bold_template(
        self,
        image: Image.Image,
        title: str,
        subtitle: Optional[str] = None,
        **kwargs,
    ) -> Image.Image:
        """
        Bold template with large text and strong contrast

        Features: Large title, dark vignette, yellow accent
        """
        img = image.copy()

        # Apply subtle vignette
        img = self._add_vignette(img, intensity=0.3)

        # Add dark gradient overlay at top/bottom for text readability
        img = self._add_gradient_overlay(img, "vertical")

        # Add title with yellow color
        img = text_overlay.add_text(
            img,
            title,
            position="center",
            font_size=100,
            font_color="yellow",
            stroke_color="black",
            stroke_width=5,
            font_name="Impact",
        )

        # Add subtitle if provided
        if subtitle:
            img = text_overlay.add_text(
                img,
                subtitle,
                position="bottom",
                font_size=50,
                font_color="white",
                stroke_color="black",
                stroke_width=3,
            )

        return img

    def dramatic_template(
        self,
        image: Image.Image,
        title: str,
        subtitle: Optional[str] = None,
        **kwargs,
    ) -> Image.Image:
        """
        Dramatic template with high contrast and dark theme

        Features: Desaturated background, red accent, heavy shadow
        """
        img = image.copy()

        # Reduce saturation
        enhancer = ImageEnhance.Color(img)
        img = enhancer.enhance(0.5)

        # Increase contrast
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(1.5)

        # Add dark vignette
        img = self._add_vignette(img, intensity=0.5)

        # Add title with red color and shadow
        img = text_overlay.add_shadow(
            img,
            title,
            position="center",
            font_size=90,
            font_color="red",
            stroke_color="darkred",
            stroke_width=4,
            shadow_offset=(8, 8),
        )

        if subtitle:
            img = text_overlay.add_text(
                img,
                subtitle,
                position="bottom",
                font_size=40,
                font_color="white",
                stroke_color="black",
                stroke_width=2,
            )

        return img

    def colorful_template(
        self,
        image: Image.Image,
        title: str,
        subtitle: Optional[str] = None,
        **kwargs,
    ) -> Image.Image:
        """
        Colorful template with vibrant colors

        Features: Enhanced saturation, rainbow gradient, playful style
        """
        img = image.copy()

        # Boost saturation
        enhancer = ImageEnhance.Color(img)
        img = enhancer.enhance(1.5)

        # Add rainbow gradient overlay
        img = self._add_rainbow_gradient(img, opacity=0.2)

        # Add title with colorful gradient text effect (simulated with shadow layers)
        img = text_overlay.add_text(
            img,
            title,
            position="center",
            font_size=95,
            font_color="white",
            stroke_color="magenta",
            stroke_width=6,
        )

        if subtitle:
            img = text_overlay.add_text(
                img,
                subtitle,
                position="bottom",
                font_size=45,
                font_color="cyan",
                stroke_color="blue",
                stroke_width=3,
            )

        return img

    def minimal_template(
        self,
        image: Image.Image,
        title: str,
        subtitle: Optional[str] = None,
        **kwargs,
    ) -> Image.Image:
        """
        Minimal template with clean design

        Features: Blur background, clean text, simple colors
        """
        img = image.copy()

        # Apply slight blur to background
        img = img.filter(ImageFilter.GaussianBlur(radius=3))

        # Reduce saturation for cleaner look
        enhancer = ImageEnhance.Color(img)
        img = enhancer.enhance(0.7)

        # Add semi-transparent bar for text
        draw = ImageDraw.Draw(img, "RGBA")
        bar_height = img.height // 3
        draw.rectangle(
            [(0, img.height // 2 - bar_height // 2), (img.width, img.height // 2 + bar_height // 2)],
            fill=(0, 0, 0, 180),
        )

        # Add clean title
        img = text_overlay.add_text(
            img,
            title,
            position="center",
            font_size=80,
            font_color="white",
            stroke_width=0,  # No stroke for minimal look
        )

        if subtitle:
            img = text_overlay.add_text(
                img,
                subtitle,
                position="bottom_third",
                font_size=40,
                font_color="lightgray",
                stroke_width=0,
            )

        return img

    def gaming_template(
        self,
        image: Image.Image,
        title: str,
        subtitle: Optional[str] = None,
        **kwargs,
    ) -> Image.Image:
        """
        Gaming template with neon aesthetics

        Features: Neon colors, tech vibe, energetic
        """
        img = image.copy()

        # Increase contrast
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(1.3)

        # Add neon glow effect (simulated with colored vignette)
        img = self._add_colored_vignette(img, color=(0, 255, 255), intensity=0.3)

        # Add title with neon cyan color
        img = text_overlay.add_text(
            img,
            title,
            position="center",
            font_size=90,
            font_color="cyan",
            stroke_color="blue",
            stroke_width=5,
        )

        if subtitle:
            img = text_overlay.add_text(
                img,
                subtitle,
                position="bottom",
                font_size=45,
                font_color="lime",
                stroke_color="green",
                stroke_width=3,
            )

        return img

    def split_template(
        self,
        image: Image.Image,
        title: str,
        subtitle: Optional[str] = None,
        **kwargs,
    ) -> Image.Image:
        """
        Split template with title at top, subtitle at bottom

        Features: Divided layout, clear separation
        """
        img = image.copy()

        # Add gradient bars at top and bottom
        draw = ImageDraw.Draw(img, "RGBA")

        # Top bar
        for i in range(img.height // 4):
            alpha = int(255 * (1 - i / (img.height // 4)))
            draw.rectangle(
                [(0, i), (img.width, i + 1)],
                fill=(0, 0, 0, alpha),
            )

        # Bottom bar
        for i in range(img.height // 4):
            alpha = int(255 * (i / (img.height // 4)))
            y = img.height - img.height // 4 + i
            draw.rectangle(
                [(0, y), (img.width, y + 1)],
                fill=(0, 0, 0, alpha),
            )

        # Add title at top
        img = text_overlay.add_text(
            img,
            title,
            position="top",
            font_size=70,
            font_color="white",
            stroke_color="black",
            stroke_width=4,
        )

        if subtitle:
            img = text_overlay.add_text(
                img,
                subtitle,
                position="bottom",
                font_size=50,
                font_color="yellow",
                stroke_color="black",
                stroke_width=3,
            )

        return img

    def gradient_template(
        self,
        image: Image.Image,
        title: str,
        subtitle: Optional[str] = None,
        **kwargs,
    ) -> Image.Image:
        """
        Gradient overlay template

        Features: Colorful gradient overlay, modern style
        """
        img = image.copy()

        # Add gradient overlay
        img = self._add_gradient_overlay(img, "diagonal", color1=(138, 43, 226), color2=(75, 0, 130))

        # Add title
        img = text_overlay.add_text(
            img,
            title,
            position="center",
            font_size=85,
            font_color="white",
            stroke_color="purple",
            stroke_width=5,
        )

        if subtitle:
            img = text_overlay.add_text(
                img,
                subtitle,
                position="bottom",
                font_size=45,
                font_color="lavender",
                stroke_color="indigo",
                stroke_width=3,
            )

        return img

    def vlog_template(
        self,
        image: Image.Image,
        title: str,
        subtitle: Optional[str] = None,
        **kwargs,
    ) -> Image.Image:
        """
        Vlog-style template with casual aesthetic

        Features: Handwritten-style font, casual colors, personal feel
        """
        img = image.copy()

        # Slightly warmer tones
        enhancer = ImageEnhance.Color(img)
        img = enhancer.enhance(1.2)

        # Lighten the image slightly
        enhancer = ImageEnhance.Brightness(img)
        img = enhancer.enhance(1.1)

        # Add light vignette
        img = self._add_vignette(img, intensity=0.2)

        # Add title with casual style
        img = text_overlay.add_text(
            img,
            title,
            position="bottom_third",
            font_size=75,
            font_color="white",
            stroke_color="coral",
            stroke_width=4,
        )

        if subtitle:
            img = text_overlay.add_text(
                img,
                subtitle,
                position="bottom",
                font_size=40,
                font_color="peachpuff",
                stroke_color="salmon",
                stroke_width=2,
            )

        return img

    # Helper functions

    def _add_vignette(self, image: Image.Image, intensity: float = 0.5) -> Image.Image:
        """Add vignette effect (darkened edges)"""
        img = image.copy()
        width, height = img.size

        # Create radial gradient mask
        mask = Image.new("L", (width, height), 0)
        draw = ImageDraw.Draw(mask)

        # Draw elliptical gradient
        for i in range(256):
            alpha = int((1 - intensity) * 255 + intensity * i)
            offset = int((width / 2) * (i / 255))
            draw.ellipse(
                [offset, offset * height // width, width - offset, height - offset * height // width],
                fill=alpha,
            )

        # Apply mask
        dark = Image.new("RGB", img.size, "black")
        img = Image.composite(img, dark, mask)

        return img

    def _add_colored_vignette(
        self, image: Image.Image, color: tuple, intensity: float = 0.5
    ) -> Image.Image:
        """Add colored vignette effect"""
        img = image.copy()
        width, height = img.size

        # Create radial gradient mask
        colored_overlay = Image.new("RGBA", (width, height), color + (0,))
        draw = ImageDraw.Draw(colored_overlay)

        # Draw elliptical gradient with color
        for i in range(256):
            alpha = int(intensity * (255 - i))
            offset = int((width / 2) * (i / 255))
            draw.ellipse(
                [offset, offset * height // width, width - offset, height - offset * height // width],
                fill=color + (alpha,),
            )

        # Composite
        img = Image.alpha_composite(img.convert("RGBA"), colored_overlay)

        return img.convert("RGB")

    def _add_gradient_overlay(
        self,
        image: Image.Image,
        direction: str = "vertical",
        color1: tuple = (0, 0, 0),
        color2: tuple = (0, 0, 0),
        opacity: float = 0.5,
    ) -> Image.Image:
        """Add gradient overlay"""
        img = image.copy().convert("RGBA")
        width, height = img.size

        # Create gradient
        gradient = Image.new("RGBA", (width, height), color1 + (0,))
        draw = ImageDraw.Draw(gradient)

        if direction == "vertical":
            for y in range(height):
                alpha = int(opacity * 255 * (y / height))
                draw.line([(0, y), (width, y)], fill=color2 + (alpha,))
        elif direction == "horizontal":
            for x in range(width):
                alpha = int(opacity * 255 * (x / width))
                draw.line([(x, 0), (x, height)], fill=color2 + (alpha,))
        elif direction == "diagonal":
            for i in range(max(width, height)):
                alpha = int(opacity * 255 * (i / max(width, height)))
                draw.line([(0, i), (i, 0)], fill=color2 + (alpha,), width=2)

        # Composite
        img = Image.alpha_composite(img, gradient)

        return img.convert("RGB")

    def _add_rainbow_gradient(self, image: Image.Image, opacity: float = 0.3) -> Image.Image:
        """Add rainbow gradient overlay"""
        img = image.copy().convert("RGBA")
        width, height = img.size

        rainbow = Image.new("RGBA", (width, height))
        draw = ImageDraw.Draw(rainbow)

        # Create rainbow bands
        colors = [
            (255, 0, 0),    # Red
            (255, 127, 0),  # Orange
            (255, 255, 0),  # Yellow
            (0, 255, 0),    # Green
            (0, 0, 255),    # Blue
            (75, 0, 130),   # Indigo
            (148, 0, 211),  # Violet
        ]

        band_height = height // len(colors)
        alpha = int(opacity * 255)

        for i, color in enumerate(colors):
            y = i * band_height
            draw.rectangle(
                [(0, y), (width, y + band_height)],
                fill=color + (alpha,),
            )

        img = Image.alpha_composite(img, rainbow)

        return img.convert("RGB")


# Global instance
thumbnail_templates = ThumbnailTemplates()
