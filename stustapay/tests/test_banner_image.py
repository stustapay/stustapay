"""Tests for event banner image validation and safe HTTP response metadata."""

from io import BytesIO

import pytest
from PIL import Image

from stustapay.core.banner_image import BANNER_MAX_BYTES, http_response_for_stored_banner, validate_and_prepare_banner_upload
from sftkit.error import InvalidArgument


def _tiny_png_bytes() -> bytes:
    im = Image.new("RGB", (1, 1), color=(200, 10, 50))
    buf = BytesIO()
    im.save(buf, format="PNG")
    return buf.getvalue()


def test_validate_accepts_png_and_returns_canonical_mime() -> None:
    raw = _tiny_png_bytes()
    out_bytes, mime = validate_and_prepare_banner_upload(raw)
    assert out_bytes == raw
    assert mime == "image/png"


def test_validate_rejects_empty() -> None:
    with pytest.raises(InvalidArgument, match="empty"):
        validate_and_prepare_banner_upload(b"")


def test_validate_rejects_non_image() -> None:
    with pytest.raises(InvalidArgument, match="valid"):
        validate_and_prepare_banner_upload(b"<html><script>alert(1)</script></html>")


def test_validate_rejects_oversize() -> None:
    with pytest.raises(InvalidArgument, match="at most"):
        validate_and_prepare_banner_upload(b"\x00" * (BANNER_MAX_BYTES + 1))


def test_http_response_sniffs_mime_for_valid_png() -> None:
    raw = _tiny_png_bytes()
    meta = http_response_for_stored_banner(raw)
    assert meta is not None
    assert meta["mime_type"] == "image/png"
    assert meta["image"] == raw
    assert meta["headers"] == {"Cache-Control": "public, max-age=3600"}


def test_http_response_octet_stream_for_junk() -> None:
    meta = http_response_for_stored_banner(b"not an image")
    assert meta is not None
    assert meta["mime_type"] == "application/octet-stream"
    assert "Content-Disposition" in meta["headers"]
