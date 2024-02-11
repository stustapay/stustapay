import asyncio
import enum
import logging
import uuid
from datetime import datetime, timedelta

import aiohttp
from pydantic import BaseModel

from stustapay.core.service.common.error import ServiceException


class SumUpError(ServiceException):
    id = "SumUpError"

    def __init__(self, msg: str):
        self.msg = msg


class _SumUpErrorFormat(BaseModel):
    error: str


class SumUpCreateCheckout(BaseModel):
    checkout_reference: uuid.UUID
    amount: float
    currency: str
    merchant_code: str
    description: str


class SumUpTransaction(BaseModel):
    amount: float
    currency: str
    id: str
    payment_type: str | None = None
    product_summary: str | None = None
    card_type: str | None = None
    type: str | None = None
    status: str
    timestamp: datetime
    transaction_code: str


class SumUpTransactionResp(BaseModel):
    items: list[SumUpTransaction]


class SumUpCheckoutStatus(enum.Enum):
    PENDING = "PENDING"
    FAILED = "FAILED"
    PAID = "PAID"


class SumUpCheckout(SumUpCreateCheckout):
    id: str
    status: SumUpCheckoutStatus
    valid_until: datetime | None = None
    date: datetime
    transaction_code: str | None = None
    transaction_id: str | None = None
    transactions: list[SumUpTransaction] = []


class SumUpApi:
    SUMUP_API_URL = "https://api.sumup.com/v0.1"
    SUMUP_CHECKOUT_URL = f"{SUMUP_API_URL}/checkouts"
    SUMUP_AUTH_REFRESH_THRESHOLD = timedelta(seconds=180)
    SUMUP_CHECKOUT_POLL_INTERVAL = timedelta(seconds=5)
    SUMUP_INITIAL_CHECK_TIMEOUT = timedelta(seconds=20)

    def __init__(self, api_key: str, merchant_code: str):
        self.api_key = api_key
        self.merchant_code = merchant_code

    def _get_sumup_auth_headers(self) -> dict:
        return {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }

    async def _get(self, url: str, query: dict | None = None) -> dict:
        async with aiohttp.ClientSession(trust_env=True, headers=self._get_sumup_auth_headers()) as session:
            try:
                async with session.get(url, params=query, timeout=2) as response:
                    if not response.ok:
                        resp = await response.json()
                        err = _SumUpErrorFormat.model_validate(resp)
                        raise SumUpError(f"SumUp API returned an error: {err.error}")
                    return await response.json()
            except asyncio.TimeoutError as e:
                raise SumUpError("SumUp API timeout") from e
            except Exception as e:  # pylint: disable=bare-except
                if isinstance(e, SumUpError):
                    raise e
                raise SumUpError("SumUp API returned an unknown error") from e

    async def _post(self, url: str, data: BaseModel, query: dict | None = None) -> dict:
        async with aiohttp.ClientSession(
            trust_env=True,
            headers=self._get_sumup_auth_headers(),
        ) as session:
            try:
                async with session.post(url, data=data.model_dump_json(), params=query, timeout=2) as response:
                    if not response.ok:
                        try:
                            resp = await response.json()
                            err = _SumUpErrorFormat.model_validate(resp)
                            raise SumUpError(f'SumUp API returned an error: "{err.error}"')
                        except Exception as e:
                            logging.error(f"SumUp API error {response.content}, {e}")
                            raise SumUpError("SumUp API returned an unknown error") from e
                    return await response.json()
            except asyncio.TimeoutError as e:
                raise SumUpError("SumUp API timeout") from e
            except Exception as e:  # pylint: disable=bare-except
                if isinstance(e, SumUpError):
                    raise e
                raise SumUpError(f"SumUp API returned an unknown error {e}") from e

    async def check_sumup_auth(self) -> bool:
        url = f"{self.SUMUP_API_URL}/merchants/{self.merchant_code}/payment-methods"
        try:
            await self._get(url)
            return True
        except Exception:  # pylint: disable=bare-except
            return False

    async def create_sumup_checkout(self, checkout: SumUpCreateCheckout) -> SumUpCheckout:
        resp = await self._post(self.SUMUP_CHECKOUT_URL, checkout)
        return SumUpCheckout.model_validate(resp)

    async def get_checkout(self, checkout_id: str) -> SumUpCheckout:
        url = f"{self.SUMUP_CHECKOUT_URL}/{checkout_id}"
        resp = await self._get(url)
        return SumUpCheckout.model_validate(resp)

    async def list_checkouts(self) -> list[SumUpCheckout]:
        resp = await self._get(self.SUMUP_CHECKOUT_URL)

        if not isinstance(resp, list):
            raise SumUpError("SumUp API returned an invalid response")

        return [SumUpCheckout.model_validate(x) for x in resp]

    async def list_transactions(self) -> list[SumUpTransaction]:
        resp = await self._get(f"{self.SUMUP_API_URL}/me/transactions/history", query={"limit": 10000})
        parsed_resp = SumUpTransactionResp.model_validate(resp)
        return parsed_resp.items
