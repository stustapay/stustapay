# based on https://github.com/pretix/python-dsfinvk, Coypright rami.io GmbH, Apache Lizenz
# with modifications by StuStaPay, 2023

import csv
from collections import defaultdict
from io import BytesIO, StringIO
from zipfile import ZIP_DEFLATED, ZipFile

from .table import Model


class Collection:
    def __init__(self):
        self.records = defaultdict(list)

    def add(self, record: Model):
        self.records[record.filename].append(record)

    def _write_to_zip(self, zf: ZipFile, xml_path, dtd_path):
        for k, records in self.records.items():
            b = StringIO()
            w = csv.DictWriter(b, fieldnames=[f.name for f in records[0]._fields], delimiter=";", lineterminator="\r\n")
            w.writeheader()
            for r in records:
                if r.data:
                    w.writerow(r.data)
            b.seek(0)
            zf.writestr(k, b.read())
        zf.write(xml_path, "index.xml")
        zf.write(dtd_path, "gdpdu-01-08-2002.dtd")

    def write(self, name, xml_path, dtd_path):
        with ZipFile(name, "w", compression=ZIP_DEFLATED, compresslevel=9, strict_timestamps=False) as zf:
            self._write_to_zip(zf, xml_path, dtd_path)

    def write_bytes(self, xml_path, dtd_path) -> bytes:
        buffer = BytesIO()
        with ZipFile(buffer, "w", compression=ZIP_DEFLATED, compresslevel=9, strict_timestamps=False) as zf:
            self._write_to_zip(zf, xml_path, dtd_path)
        return buffer.getvalue()
