"""
Internal helpers for the administration API that communicate with external systems.
"""

from .headwind import HeadwindClient, HeadwindDevice, HeadwindError, get_headwind_client

__all__ = [
    "HeadwindClient",
    "HeadwindDevice",
    "HeadwindError",
    "get_headwind_client",
]

