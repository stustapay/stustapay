import os.path

from .common import BaseTestCase
from ..bon.pdflatex import pdflatex


class BonGeneratorTest(BaseTestCase):
    async def test_pdflatex(self):
        context = {"name": "TEST NAME"}
        out_file = "/tmp/bon_test.pdf"
        success, msg = await pdflatex("bon.tex", context, out_file)
        self.assertTrue(success)
        self.assertTrue(os.path.exists(out_file))
