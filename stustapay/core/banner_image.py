"""Validation and safe HTTP metadata for event banner images (raster only)."""

from __future__ import annotations

from io import BytesIO
from typing import Final

from PIL import Image, UnidentifiedImageError
from sftkit.error import InvalidArgument

# Upper bound for uploaded banner payloads (decoded image bytes).
BANNER_MAX_BYTES: Final[int] = 5 * 1024 * 1024

_WHITELIST_FORMAT_TO_MIME: Final[dict[str, str]] = {
    "PNG": "image/png",
    "JPEG": "image/jpeg",
    "GIF": "image/gif",
    "WEBP": "image/webp",
}
_ALLOWED_PIL_FORMATS: Final[tuple[str, ...]] = tuple(_WHITELIST_FORMAT_TO_MIME)


def canonical_mime_for_pil_format(pil_format: str | None) -> str | None:
    if not pil_format:
        return None
    key = pil_format.upper()
    if key == "JPG":
        key = "JPEG"
    return _WHITELIST_FORMAT_TO_MIME.get(key)


def validate_and_prepare_banner_upload(image_data: bytes) -> tuple[bytes, str]:
    """
    Ensure the payload is a decodable raster image within size limits.
    Returns the original bytes and a canonical Content-Type (never caller-controlled).
    """
    if not image_data:
        raise InvalidArgument("Banner image is empty")
    if len(image_data) > BANNER_MAX_BYTES:
        raise InvalidArgument(f"Banner image must be at most {BANNER_MAX_BYTES} bytes")

    try:
        with Image.open(BytesIO(image_data), formats=_ALLOWED_PIL_FORMATS) as im:
            im.verify()
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise InvalidArgument("Banner must be a valid PNG, JPEG, GIF, or WebP image") from exc

    try:
        with Image.open(BytesIO(image_data), formats=_ALLOWED_PIL_FORMATS) as im:
            im.load()
            mime = canonical_mime_for_pil_format(im.format)
            if mime is None:
                raise InvalidArgument("Banner must be a PNG, JPEG, GIF, or WebP image")
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise InvalidArgument("Banner must be a valid PNG, JPEG, GIF, or WebP image") from exc

    return image_data, mime


def http_response_for_stored_banner(image_data: bytes | None) -> dict[str, object] | None:
    """
    Build Content-Type and Cache-Control (and Content-Disposition when unsafe) for a stored banner.
    Returns None if image_data is None.
    """
    if image_data is None:
        return None

    media_type = "application/octet-stream"
    headers: dict[str, str] = {
        "Cache-Control": "public, max-age=3600",
        "Content-Disposition": 'attachment; filename="banner"',
    }

    try:
        with Image.open(BytesIO(image_data), formats=_ALLOWED_PIL_FORMATS) as im:
            im.verify()
        with Image.open(BytesIO(image_data), formats=_ALLOWED_PIL_FORMATS) as im:
            im.load()
            mime = canonical_mime_for_pil_format(im.format)
            if mime is not None:
                media_type = mime
                headers = {"Cache-Control": "public, max-age=3600"}
    except (UnidentifiedImageError, OSError, ValueError):
        pass

    return {
        "image": image_data,
        "mime_type": media_type,
        "headers": headers,
    }
