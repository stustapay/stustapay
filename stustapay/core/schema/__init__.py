"""
here, data structures are defined.
they are manipulated usually through the service implementation.

in db/ are the database schema definitions.
"""

from pathlib import Path

REVISION_PATH = Path(__file__).parent / "db"
DATA_PATH = Path(__file__).parent / "example_data"
DEFAULT_EXAMPLE_DATA_FILE = "example_data.sql"
