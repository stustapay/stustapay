"""
Helper Functions to generate pdfs from latex templates and store the result as file
"""

import asyncio
import logging
import os
import re
import subprocess
from datetime import datetime
from pathlib import Path
from tempfile import TemporaryDirectory

import jinja2
from pydantic import BaseModel
from pylatexenc.latexencode import (
    RULE_REGEX,
    UnicodeToLatexConversionRule,
    UnicodeToLatexEncoder,
)

logger = logging.getLogger(__name__)

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


def jfilter_percent(value: float):
    # format percentages as ' 7,00%'
    return f"{value * 100:5.2f}\\%".replace(".", ",")


def jfilter_datetime(t: datetime):
    return LatexEncoder.unicode_to_latex(t.strftime("%Y-%m-%d %H:%M:%S"))


def setup_jinja_env(currency_symbol: str):
    def jfilter_money(value: float):
        # how are the money values printed in the pdf
        return f"{value:8.2f}{currency_symbol}".replace(".", ",")

    def jfilter_money_no_currency(value: float):
        # how are the money values printed in the pdf
        return f"{value:8.2f}".replace(".", ",")

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
    env.filters["money_wo_currency"] = jfilter_money_no_currency
    env.filters["percent"] = jfilter_percent
    env.filters["datetime"] = jfilter_datetime
    env.filters["latex"] = LatexEncoder.unicode_to_latex
    return env


async def render_template(tex_tpl_name: str, context, currency_symbol: str) -> str:
    env = setup_jinja_env(currency_symbol=currency_symbol)
    tpl = env.get_template(tex_tpl_name)
    return tpl.render(context)


class RenderedPdf(BaseModel):
    mime_type: str
    content: bytes


class PdfRenderResult(BaseModel):
    success: bool
    msg: str = ""
    bon: RenderedPdf | None = None


class File(BaseModel):
    name: str
    content: bytes


async def pdflatex(file_content: str, additional_files: list[File]) -> PdfRenderResult:
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
        for file in additional_files:
            with open(os.path.join(tmp_dir, file.name), "wb+") as f:
                f.write(file.content)

        latexmk = ["latexmk", "-shell-escape", "-xelatex", "-halt-on-error", main_tex]

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
                print(stdout.decode())
                msg = stdout.decode("utf-8")[-800:]
                logger.debug(f"Error generating latex pdf: {msg}")
                return PdfRenderResult(success=False, msg=msg)
        except subprocess.SubprocessError as e:
            logger.debug(f"Error generating latex pdf: {e}")
            return PdfRenderResult(success=False, msg=f"latex failed with error {e}")

        output_pdf = Path(tmp_dir) / "main.pdf"

        try:
            pdf_content = output_pdf.read_bytes()
        except Exception as e:
            logger.debug(f"Error generating latex pdf: {e}")
            return PdfRenderResult(success=False, msg=str(e))

        return PdfRenderResult(success=True, bon=RenderedPdf(mime_type="application/pdf", content=pdf_content))
