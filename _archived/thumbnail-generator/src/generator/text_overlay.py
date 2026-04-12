"""
Text Overlay for Thumbnails
"""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import logging
from typing import Optional, Tuple

from ..config import settings

logger = logging.getLogger(__name__)


class TextOverlay:
    """Add text overlays to thumbnail images"""

    def __init__(self):
        self.fonts_dir = Path(settings.FONTS_DIR)
        self.default_font_size = settings.DEFAULT_FONT_SIZE

    def add_text(
        self,
        image: Image.Image,
        text: str,
        position: str = "center",
        font_size: Optional[int] = None,
        font_color: str = None,
        stroke_color: str = None,
        stroke_width: int = None,
        font_name: str = "Impact",
        max_width: float = 0.9,
    ) -> Image.Image:
        """
        Add text overlay to image

        Args:
            image: Base image
            text: Text to add
            position: "top", "center", "bottom", or (x, y) tuple
            font_size: Font size (default from config)
            font_color: Text color
            stroke_color: Outline color
            stroke_width: Outline width
            font_name: Font family name
            max_width: Maximum text width as fraction of image width

        Returns:
            Image with text overlay
        """
        # Create a copy to avoid modifying original
        img = image.copy()
        draw = ImageDraw.Draw(img)

        # Load font
        font = self._load_font(font_name, font_size or self.default_font_size)

        # Auto-adjust font size if text is too wide
        font = self._adjust_font_size(
            draw, text, font, font_name, int(img.width * max_width)
        )

        # Get text bounding box
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]

        # Calculate position
        x, y = self._calculate_position(
            position, img.width, img.height, text_width, text_height
        )

        # Draw text with stroke (outline)
        draw.text(
            (x, y),
            text,
            font=font,
            fill=font_color or settings.DEFAULT_FONT_COLOR,
            stroke_width=stroke_width or settings.DEFAULT_STROKE_WIDTH,
            stroke_fill=stroke_color or settings.DEFAULT_STROKE_COLOR,
        )

        return img

    def add_multi_line_text(
        self,
        image: Image.Image,
        lines: list[str],
        spacing: int = 20,
        **kwargs,
    ) -> Image.Image:
        """
        Add multiple lines of text

        Args:
            image: Base image
            lines: List of text lines
            spacing: Space between lines
            **kwargs: Arguments passed to add_text()

        Returns:
            Image with multi-line text
        """
        img = image.copy()

        # Calculate total height needed
        temp_draw = ImageDraw.Draw(img)
        font = self._load_font(
            kwargs.get("font_name", "Impact"),
            kwargs.get("font_size", self.default_font_size),
        )

        line_heights = []
        for line in lines:
            bbox = temp_draw.textbbox((0, 0), line, font=font)
            line_heights.append(bbox[3] - bbox[1])

        total_height = sum(line_heights) + spacing * (len(lines) - 1)

        # Calculate starting Y position (center vertically)
        start_y = (img.height - total_height) // 2

        # Draw each line
        current_y = start_y
        for i, line in enumerate(lines):
            # Override position for each line
            line_kwargs = kwargs.copy()
            line_kwargs["position"] = ("center", current_y)

            img = self.add_text(img, line, **line_kwargs)
            current_y += line_heights[i] + spacing

        return img

    def add_title_subtitle(
        self,
        image: Image.Image,
        title: str,
        subtitle: str,
        title_size: int = None,
        subtitle_size: int = None,
        **kwargs,
    ) -> Image.Image:
        """
        Add title and subtitle to image

        Args:
            image: Base image
            title: Main title text
            subtitle: Subtitle text
            title_size: Title font size
            subtitle_size: Subtitle font size
            **kwargs: Additional arguments

        Returns:
            Image with title and subtitle
        """
        img = image.copy()

        # Add title (upper portion)
        img = self.add_text(
            img,
            title,
            position="top_third",
            font_size=title_size or self.default_font_size,
            **kwargs,
        )

        # Add subtitle (lower portion)
        img = self.add_text(
            img,
            subtitle,
            position="bottom_third",
            font_size=subtitle_size or (self.default_font_size // 2),
            **kwargs,
        )

        return img

    def _load_font(self, font_name: str, size: int) -> ImageFont.FreeTypeFont:
        """Load a font file"""
        # Try to load custom font
        font_path = self.fonts_dir / f"{font_name}.ttf"

        if font_path.exists():
            try:
                return ImageFont.truetype(str(font_path), size)
            except Exception as e:
                logger.warning(f"Failed to load font {font_path}: {e}")

        # Try system fonts
        try:
            return ImageFont.truetype(font_name, size)
        except Exception:
            logger.warning(f"Font {font_name} not found, using default")
            # Return default font
            try:
                return ImageFont.load_default()
            except Exception:
                # Pillow 10+ changed default font behavior
                return ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", size)

    def _adjust_font_size(
        self,
        draw: ImageDraw.ImageDraw,
        text: str,
        font: ImageFont.FreeTypeFont,
        font_name: str,
        max_width: int,
    ) -> ImageFont.FreeTypeFont:
        """Auto-adjust font size to fit within max_width"""
        current_size = font.size

        while current_size > 20:  # Minimum font size
            bbox = draw.textbbox((0, 0), text, font=font)
            text_width = bbox[2] - bbox[0]

            if text_width <= max_width:
                break

            # Reduce font size
            current_size -= 5
            font = self._load_font(font_name, current_size)

        return font

    def _calculate_position(
        self,
        position: str | Tuple[int, int],
        img_width: int,
        img_height: int,
        text_width: int,
        text_height: int,
    ) -> Tuple[int, int]:
        """Calculate text position coordinates"""
        if isinstance(position, tuple):
            return position

        # Center horizontally by default
        x = (img_width - text_width) // 2

        # Calculate Y based on position
        if position == "top":
            y = img_height // 10
        elif position == "top_third":
            y = img_height // 3 - text_height // 2
        elif position == "center":
            y = (img_height - text_height) // 2
        elif position == "bottom_third":
            y = (img_height * 2 // 3) - text_height // 2
        elif position == "bottom":
            y = img_height - img_height // 10 - text_height
        else:
            # Default to center
            y = (img_height - text_height) // 2

        return (x, y)

    def add_shadow(
        self,
        image: Image.Image,
        text: str,
        position: str = "center",
        shadow_offset: Tuple[int, int] = (5, 5),
        shadow_color: str = "black",
        **kwargs,
    ) -> Image.Image:
        """
        Add text with shadow effect

        Args:
            image: Base image
            text: Text to add
            position: Text position
            shadow_offset: (x, y) offset for shadow
            shadow_color: Shadow color
            **kwargs: Arguments passed to add_text()

        Returns:
            Image with shadowed text
        """
        img = image.copy()

        # First draw shadow
        shadow_kwargs = kwargs.copy()
        shadow_kwargs["font_color"] = shadow_color
        shadow_kwargs["stroke_width"] = 0  # No stroke on shadow

        # Calculate shadow position
        if isinstance(position, tuple):
            shadow_pos = (position[0] + shadow_offset[0], position[1] + shadow_offset[1])
        else:
            shadow_pos = position  # Will be calculated in add_text

        img = self.add_text(img, text, shadow_pos, **shadow_kwargs)

        # Then draw main text
        img = self.add_text(img, text, position, **kwargs)

        return img


# Global instance
text_overlay = TextOverlay()
