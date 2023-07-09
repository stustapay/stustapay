"""
Helper Functions to generate pdfs from latex templates and store the result as file
"""

import asyncio
import os
import re
import shutil
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Tuple

import jinja2
from pylatexenc.latexencode import (
    RULE_REGEX,
    UnicodeToLatexConversionRule,
    UnicodeToLatexEncoder,
)

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


async def render_template(tex_tpl_name: str, context: dict) -> str:
    env = setup_jinja_env()
    tpl = env.get_template(tex_tpl_name)
    return tpl.render(context)


async def pdflatex(file_content: str, out_file: Path) -> Tuple[bool, str]:
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
            return False, stdout.decode("utf-8")[-800:]

        # don't overwrite existing bons
        if os.path.exists(out_file):
            pass  # for now we allow overwrites
            # return False, f"File {out_file} already exists"
        shutil.copyfile(os.path.join(tmp_dir, "main.pdf"), out_file)

        return True, ""
