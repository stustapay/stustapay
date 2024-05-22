#!/usr/bin/env python3

import argparse
import os
import re
from pathlib import Path

from stustapay.core.schema import REVISION_PATH
from stustapay.framework.database import SchemaRevision


def main(name: str):
    revisions = SchemaRevision.revisions_from_dir(REVISION_PATH)
    filename = f"{str(len(revisions)).zfill(4)}-{name}.sql"
    new_revision_version = os.urandom(4).hex()
    file_path = REVISION_PATH / filename
    with file_path.open("w+") as f:
        f.write(f"-- revision: {new_revision_version}\n-- requires: {revisions[-1].version}\n")

    database_py_file = Path(__file__).parent / "stustapay" / "core" / "database.py"
    with open(database_py_file, "rw") as f:
        content = f.read()
        new_content = re.sub(
            'CURRENT_REVISION = "[a-f0-9]+"\n', f'CURRENT_REVISION = "{new_revision_version}"', content
        )
        f.write(new_content)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(prog="DB utilty", description="Utility to create new database revision files")
    parser.add_argument("name", type=str)
    args = parser.parse_args()
    main(args.name)
