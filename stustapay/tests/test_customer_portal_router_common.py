from starlette.requests import Request

from stustapay.customer_portal.routers.common import get_customer_portal_base_url


def _build_request(*, headers: list[tuple[bytes, bytes]] | None = None) -> Request:
    scope = {
        "type": "http",
        "http_version": "1.1",
        "method": "GET",
        "scheme": "http",
        "path": "/customer",
        "raw_path": b"/customer",
        "query_string": b"",
        "headers": headers or [(b"host", b"internal:8080")],
        "server": ("internal", 8080),
        "client": ("127.0.0.1", 1234),
    }
    return Request(scope)


def test_get_customer_portal_base_url_falls_back_to_request_base_url():
    request = _build_request()

    assert get_customer_portal_base_url(request) == "http://internal:8080"


def test_get_customer_portal_base_url_uses_x_forwarded_proto_and_host():
    request = _build_request(
        headers=[
            (b"host", b"internal:8080"),
            (b"x-forwarded-proto", b"https"),
            (b"x-forwarded-host", b"portal.example.com"),
        ]
    )

    assert get_customer_portal_base_url(request) == "https://portal.example.com"


def test_get_customer_portal_base_url_uses_forwarded_header_before_legacy_proxy_headers():
    request = _build_request(
        headers=[
            (b"host", b"internal:8080"),
            (b"forwarded", b'for=192.0.2.60;proto=https;host="portal.example.com"'),
            (b"x-forwarded-proto", b"http"),
            (b"x-forwarded-host", b"wrong.example.com"),
        ]
    )

    assert get_customer_portal_base_url(request) == "https://portal.example.com"


def test_get_customer_portal_base_url_appends_forwarded_port_when_needed():
    request = _build_request(
        headers=[
            (b"host", b"internal:8080"),
            (b"x-forwarded-proto", b"https"),
            (b"x-forwarded-host", b"portal.example.com"),
            (b"x-forwarded-port", b"8443"),
        ]
    )

    assert get_customer_portal_base_url(request) == "https://portal.example.com:8443"
