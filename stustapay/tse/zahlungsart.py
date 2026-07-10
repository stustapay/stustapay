from stustapay.core.schema.order import PaymentMethod

PAYMENT_METHOD_TO_ZAHLUNGSART: dict[PaymentMethod, str] = {
    PaymentMethod.cash: "Bar",
    PaymentMethod.sumup: "Unbar",
    PaymentMethod.tag: "Unbar",
    PaymentMethod.sumup_online: "Unbar",
}


def zahlungsart_for_payment_method(payment_method: str) -> str:
    try:
        return PAYMENT_METHOD_TO_ZAHLUNGSART[PaymentMethod(payment_method)]
    except KeyError as exc:
        raise RuntimeError(f"unmapped payment method for KassenSichV Zahlungsart: {payment_method!r}") from exc
