from fastapi import Request


def _get_first_forwarded_value(value: str | None) -> str | None:
    if value is None:
        return None

    first_value = value.split(",", maxsplit=1)[0].strip()
    return first_value or None


def _parse_forwarded_header(value: str | None) -> dict[str, str]:
    first_forwarded_value = _get_first_forwarded_value(value)
    if first_forwarded_value is None:
        return {}

    parsed: dict[str, str] = {}
    for item in first_forwarded_value.split(";"):
        key, separator, raw_value = item.partition("=")
        if separator == "":
            continue

        normalized_key = key.strip().lower()
        normalized_value = raw_value.strip().strip('"')
        if normalized_key and normalized_value:
            parsed[normalized_key] = normalized_value

    return parsed


def _host_has_explicit_port(host: str) -> bool:
    if host.startswith("["):
        return "]:" in host

    return host.count(":") == 1


def _should_append_port(host: str, port: str, scheme: str) -> bool:
    if _host_has_explicit_port(host):
        return False

    default_port = "443" if scheme == "https" else "80"
    return port != default_port


def get_customer_portal_base_url(request: Request) -> str:
    forwarded = _parse_forwarded_header(request.headers.get("forwarded"))

    scheme = (
        forwarded.get("proto")
        or _get_first_forwarded_value(request.headers.get("x-forwarded-proto"))
        or request.url.scheme
    )
    host = (
        forwarded.get("host")
        or _get_first_forwarded_value(request.headers.get("x-forwarded-host"))
        or request.headers.get("host")
        or request.url.netloc
    )

    forwarded_port = _get_first_forwarded_value(request.headers.get("x-forwarded-port"))
    if forwarded_port is not None and _should_append_port(host, forwarded_port, scheme):
        host = f"{host}:{forwarded_port}"

    return f"{scheme}://{host}"
