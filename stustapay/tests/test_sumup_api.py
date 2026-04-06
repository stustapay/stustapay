import pytest

from stustapay.payment.sumup.api import SumUpApi, SumUpError


@pytest.mark.asyncio
async def test_list_available_payment_methods_returns_unique_normalized_ids():
    api = SumUpApi(api_key="test-key", merchant_code="M1234")

    async def fake_get(url: str, query=None):
        assert url.endswith("/merchants/M1234/payment-methods")
        assert query is None
        return {
            "available_payment_methods": [
                {"id": "CARD"},
                {"id": "apple_pay"},
                {"id": "card"},
                {"id": " qr_code_pix "},
            ]
        }

    api._get = fake_get  # type: ignore[method-assign]

    payment_methods = await api.list_available_payment_methods()

    assert payment_methods == ["card", "apple_pay", "qr_code_pix"]


@pytest.mark.asyncio
async def test_list_available_payment_methods_keeps_unknown_ids():
    api = SumUpApi(api_key="test-key", merchant_code="M1234")

    async def fake_get(url: str, query=None):
        assert url.endswith("/merchants/M1234/payment-methods")
        assert query is None
        return {"available_payment_methods": [{"id": "bank_redirect_plus"}]}

    api._get = fake_get  # type: ignore[method-assign]

    payment_methods = await api.list_available_payment_methods()

    assert payment_methods == ["bank_redirect_plus"]


@pytest.mark.asyncio
async def test_list_available_payment_methods_propagates_api_errors():
    api = SumUpApi(api_key="test-key", merchant_code="M1234")

    async def fake_get(url: str, query=None):
        raise SumUpError("boom")

    api._get = fake_get  # type: ignore[method-assign]

    with pytest.raises(SumUpError, match="boom"):
        await api.list_available_payment_methods()
