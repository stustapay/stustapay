from sftkit.http import Server

AGPL_V3_LICENSE_URL = "https://www.gnu.org/licenses/agpl-3.0.html"


def ensure_agpl_license_url(server: Server) -> Server:
    original_openapi = server.api.openapi

    def patched_openapi():
        spec = original_openapi()
        info = spec.setdefault("info", {})
        license_info = info.get("license")
        if isinstance(license_info, dict) and license_info.get("name") == "AGPL-3.0":
            license_info.setdefault("url", AGPL_V3_LICENSE_URL)
        return spec

    server.api.openapi = patched_openapi
    return server
