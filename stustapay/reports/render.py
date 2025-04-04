from pathlib import Path

from mako.template import Template
from weasyprint import CSS, HTML

from stustapay.core.schema.media import Blob

asset_dir = Path(__file__).parent / "assets"


async def render_report(template: str, template_context: dict, files: dict[str, Blob]) -> bytes:
    def url_fetcher(url: str):
        filename = url.split("/")[-1]
        if filename and filename in files:
            file = files[filename]
            return {"string": file.data, "mime_type": file.mime_type}
        # return default_url_fetcher(url)
        return None  # disallow external fetching of resources

    # TODO: use a module_directory for template caching
    report_template = Template(filename=str(asset_dir / f"{template}.html.mako"))
    rendered_template = report_template.render(**template_context)
    html = HTML(string=rendered_template, url_fetcher=url_fetcher)
    stylesheet = CSS(asset_dir / f"{template}.css")
    return html.write_pdf(stylesheets=[stylesheet])
