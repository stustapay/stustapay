"""
Helper Functions to generate pdfs from latex templates and store the result as file
"""

import asyncio
import os
import re
import subprocess
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Optional

import jinja2
from pydantic import BaseModel, computed_field
from pylatexenc.latexencode import (
    RULE_REGEX,
    UnicodeToLatexConversionRule,
    UnicodeToLatexEncoder,
)

from stustapay.core.schema.order import Order

# https://pylatexenc.readthedocs.io/en/latest/latexencode/
LatexEncoder = UnicodeToLatexEncoder(
    conversion_rules=[
        UnicodeToLatexConversionRule(
            rule_type=RULE_REGEX,
            rule=[
                # format newlines really as line breaks. Needed in the address Field
                (re.compile(r"\n"), r"\\\\"),
                # remove nullbytes
                (re.compile("\0"), r""),
                (re.compile(r"\^"), r"\^"),
            ],
        ),
        "defaults",
    ],
    unknown_char_policy="unihex",
    # unknown_char_policy="keep",
)

TEX_PATH = os.path.join(os.path.abspath(os.path.dirname(__file__)), "tex")


def jfilter_money(value: float):
    # how are the money values printed in the pdf
    return f"{value:8.2f}".replace(".", ",")


def jfilter_percent(value: float):
    # format percentages as ' 7,00%'
    return f"{value * 100:5.2f}\\%".replace(".", ",")


def setup_jinja_env():
    env = jinja2.Environment(
        block_start_string="\\BLOCK[",
        block_end_string="]",
        variable_start_string="\\VAR[",
        variable_end_string="]",
        comment_start_string="\\#[",
        comment_end_string="]",
        line_statement_prefix="%%",
        line_comment_prefix="%#",
        trim_blocks=True,
        loader=jinja2.FileSystemLoader(TEX_PATH),
    )
    env.filters["money"] = jfilter_money
    env.filters["percent"] = jfilter_percent
    env.filters["latex"] = LatexEncoder.unicode_to_latex
    return env


class BonConfig(BaseModel):
    title: str
    issuer: str
    address: str
    ust_id: str


class TaxRateAggregation(BaseModel):
    tax_name: str
    tax_rate: float
    total_price: float
    total_tax: float
    total_no_tax: float


class OrderWithTse(Order):
    signature_status: str  # new | pending | done | failure
    transaction_process_type: Optional[str] = None
    transaction_process_data: Optional[str] = None
    tse_transaction: Optional[str] = None
    tse_signaturenr: Optional[str] = None
    tse_start: Optional[str] = None
    tse_end: Optional[str] = None
    tse_hashalgo: Optional[str] = None
    tse_time_format: Optional[str] = None
    tse_signature: Optional[str] = None
    tse_public_key: Optional[str] = None
    node_id: int

    @computed_field  # type: ignore[misc]
    @property
    def tse_qr_code_text(self) -> str:
        return (
            f"V0;{self.till_id};{self.transaction_process_type};{self.transaction_process_data};"
            f"{self.tse_transaction};{self.tse_signaturenr};{self.tse_start};{self.tse_end};{self.tse_hashalgo};"
            f"{self.tse_time_format};{self.tse_signature};{self.tse_public_key}"
        )


class BonTemplateContext(BaseModel):
    order: OrderWithTse

    tax_rate_aggregations: list[TaxRateAggregation]

    config: BonConfig


async def render_template(tex_tpl_name: str, context: BonTemplateContext) -> str:
    env = setup_jinja_env()
    tpl = env.get_template(tex_tpl_name)
    return tpl.render(context)


class RenderedBon(BaseModel):
    mime_type: str
    content: bytes


class BonRenderResult(BaseModel):
    success: bool
    msg: str = ""
    bon: RenderedBon | None = None


async def pdflatex(file_content: str) -> BonRenderResult:
    """
    renders the given latex template with the context and saves the resulting pdf to out_file
    returns <True, ""> if the pdf was compiled successfully
    returns <False, error_msg> on a latex compile error
    """

    with TemporaryDirectory() as tmp_dir:
        main_tex = os.path.join(tmp_dir, "main.tex")
        with open(main_tex, "w") as f:
            f.write(file_content)

        newenv = os.environ.copy()
        newenv["TEXINPUTS"] = os.pathsep.join([TEX_PATH]) + os.pathsep

        latexmk = ["latexmk", "-xelatex", "-halt-on-error", main_tex]

        try:
            proc = await asyncio.create_subprocess_exec(
                *latexmk,
                env=newenv,
                cwd=tmp_dir,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, _ = await proc.communicate()
            # latex failed
            if proc.returncode != 0:
                return BonRenderResult(success=False, msg=stdout.decode("utf-8")[-800:])
        except subprocess.SubprocessError as e:
            return BonRenderResult(success=False, msg=f"latex failed with error {e}")

        output_pdf = Path(tmp_dir) / "main.pdf"

        try:
            pdf_content = output_pdf.read_bytes()
        except Exception as e:
            return BonRenderResult(success=False, msg=str(e))

        return BonRenderResult(success=True, bon=RenderedBon(mime_type="application/pdf", content=pdf_content))
