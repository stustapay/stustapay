"""
Internal helpers for the administration API that communicate with external systems.
"""

from .headwind import (
    HeadwindClient,
    HeadwindDevice,
    HeadwindError,
    build_headwind_custom3,
    get_headwind_client,
)

__all__ = [
    "HeadwindClient",
    "HeadwindDevice",
    "HeadwindError",
    "build_headwind_custom3",
    "get_headwind_client",
]
