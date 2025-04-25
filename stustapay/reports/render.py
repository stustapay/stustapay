from pathlib import Path

from mako.lookup import TemplateLookup
from weasyprint import CSS, HTML

from stustapay.core.schema.media import Blob

asset_dir = Path(__file__).parent / "assets"

template_lookup = TemplateLookup(directories=[str(asset_dir)])


def create_format_money(currency_symbol: str):
    def format_money(value):
        return f"{value:8.2f}{currency_symbol}".replace(".", ",")

    return format_money


def format_datetime(value):
    return value.strftime("%Y-%m-%d %H:%M:%S")


def format_percent(value):
    return f"{value * 100:5.2f}%".replace(".", ",")


async def render_report(template: str, template_context: dict, files: dict[str, Blob]) -> bytes:
    def url_fetcher(url: str):
        filename = url.split("/")[-1]
        if filename and filename in files:
            file = files[filename]
            return {"string": file.data, "mime_type": file.mime_type}
        return None  # disallow external fetching of resources

    # TODO: use a module_directory for template caching

    functions = {
        "format_money": create_format_money(
            template_context.get("currency_symbol", "€")
        ),  # TODO: check if euro symbol default makes sense here
        "format_datetime": format_datetime,
        "format_percent": format_percent,
    }

    report_template = template_lookup.get_template(f"{template}.html.mako")
    rendered_template = report_template.render(**template_context, **functions)
    html = HTML(string=rendered_template, url_fetcher=url_fetcher)
    stylesheet = CSS(asset_dir / f"{template}.css")
    return html.write_pdf(stylesheets=[stylesheet])
