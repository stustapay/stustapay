"""
Helper Functions to generate pdfs from latex templates and store the result as file
"""

# pylint: disable=anomalous-backslash-in-string

import asyncio
import os
import shutil
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Tuple

import jinja2


def jfilter_money(value: float):
    # how are the money values printed in the pdf
    return f"{value:8.2f}".replace(".", ",")


def jfilter_percent(value: float):
    # format percentages as ' 7,00'
    return f"{value * 100:5.2f}\%".replace(".", ",")


async def pdflatex(tex_tpl_name: str, context: dict, out_file: Path) -> Tuple[bool, str]:
    """
    renders the given latex template with the context and saves the resulting pdf to out_file
    returns <True, ""> if the pdf was compiled successfully
    returns <False, error_msg> on a latex compile error
    """

    tex_path = os.path.join(os.path.abspath(os.path.dirname(__file__)), "tex")
    env = jinja2.Environment(
        block_start_string="\BLOCK[",
        block_end_string="]",
        variable_start_string="\VAR[",
        variable_end_string="]",
        comment_start_string="\#[",
        comment_end_string="]",
        line_statement_prefix="%%",
        line_comment_prefix="%#",
        trim_blocks=True,
        loader=jinja2.FileSystemLoader(tex_path),
    )
    env.filters["money"] = jfilter_money
    env.filters["percent"] = jfilter_percent
    tpl = env.get_template(tex_tpl_name)
    rendered_tpl = tpl.render(context)

    with TemporaryDirectory() as tmp_dir:
        main_tex = os.path.join(tmp_dir, "main.tex")
        with open(main_tex, "w") as f:
            f.write(rendered_tpl)

        newenv = os.environ.copy()
        newenv["TEXINPUTS"] = os.pathsep.join([tex_path]) + os.pathsep

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
