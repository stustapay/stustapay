"""
here, data structures are defined.
they are manipulated usually through the service implementation.

in db/ are the database schema definitions.
"""

from pathlib import Path

MIGRATION_PATH = Path(__file__).parent / "db"
DB_CODE_PATH = Path(__file__).parent / "db_code"
