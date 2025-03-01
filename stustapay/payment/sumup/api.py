import asyncio
import enum
import logging
import uuid
from datetime import datetime, timedelta

import aiohttp
from pydantic import BaseModel

from stustapay.core.service.common.error import ServiceException

logger = logging.getLogger(__name__)

SUMUP_API_BASE_URL = "https://api.sumup.com"
SUMUP_API_URL = f"{SUMUP_API_BASE_URL}/v0.1"
SUMUP_CHECKOUT_URL = f"{SUMUP_API_URL}/checkouts"
SUMUP_AUTH_REFRESH_THRESHOLD = timedelta(seconds=180)
SUMUP_CHECKOUT_POLL_INTERVAL = timedelta(seconds=5)
SUMUP_INITIAL_CHECK_TIMEOUT = timedelta(seconds=20)
SUMUP_OAUTH_VALIDITY_TOLERANCE = timedelta(minutes=10)


class SumUpError(ServiceException):
    id = "SumUpError"

    def __init__(self, msg: str):
        self.msg = msg


class _SumUpErrorFormat(BaseModel):
    code: str
    message: str | None = None
    error: str | None = None


class _SumUpOAuthTokenResp(BaseModel):
    access_token: str
    refresh_token: str
    expires_in: int
    token_type: str


class SumUpOAuthToken(_SumUpOAuthTokenResp):
    expires_at: datetime

    def is_valid(self, tolerance=SUMUP_OAUTH_VALIDITY_TOLERANCE):
        return datetime.now().astimezone() < self.expires_at - tolerance


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


class SumUpTransactionDetail(SumUpTransaction):
    foreign_transaction_id: str


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


standard_headers = {
    "Accept": "application/json",
}


async def fetch_refresh_token_from_auth_code(client_id: str, client_secret: str, authorization_code: str):
    url = f"{SUMUP_API_BASE_URL}/token"

    payload = {
        "grant_type": "authorization_code",
        "client_id": client_id,
        "client_secret": client_secret,
        "code": authorization_code,
    }

    async with aiohttp.ClientSession(trust_env=True) as session:
        try:
            async with session.post(url, data=payload, timeout=10) as response:
                if not response.ok:
                    try:
                        resp = await response.json()
                        err = _SumUpErrorFormat.model_validate(resp)
                        raise SumUpError(f'SumUp API returned an error: "{err.error}"')
                    except Exception as e:
                        logging.error(f"SumUp API error {response.content}, {e}")
                        raise SumUpError("SumUp API returned an unknown error") from e
                resp = await response.json()
                validated_resp = _SumUpOAuthTokenResp.model_validate(resp)
                token = SumUpOAuthToken(
                    token_type=validated_resp.token_type,
                    access_token=validated_resp.access_token,
                    refresh_token=validated_resp.refresh_token,
                    expires_in=validated_resp.expires_in,
                    expires_at=datetime.now().astimezone() + timedelta(seconds=validated_resp.expires_in),
                )
                return token
        except asyncio.TimeoutError as e:
            raise SumUpError("SumUp API timeout") from e
        except Exception as e:  # pylint: disable=bare-except
            if isinstance(e, SumUpError):
                raise e
            raise SumUpError(f"SumUp API returned an unknown error {e}") from e


async def fetch_new_oauth_token(client_id: str, client_secret: str, refresh_token):
    url = f"{SUMUP_API_BASE_URL}/token"

    payload = {
        "grant_type": "refresh_token",
        "client_id": client_id,
        "client_secret": client_secret,
        "refresh_token": refresh_token,
    }

    async with aiohttp.ClientSession(trust_env=True) as session:
        try:
            async with session.post(url, data=payload, timeout=1) as response:
                if not response.ok:
                    try:
                        resp = await response.json()
                        err = _SumUpErrorFormat.model_validate(resp)
                        raise SumUpError(f'SumUp API returned an error: "{err.error}"')
                    except Exception as e:
                        logging.error(f"SumUp API error {response.content}, {e}")
                        raise SumUpError("SumUp API returned an unknown error") from e
                resp = await response.json()
                validated_resp = _SumUpOAuthTokenResp.model_validate(resp)
                token = SumUpOAuthToken(
                    token_type=validated_resp.token_type,
                    access_token=validated_resp.access_token,
                    refresh_token=validated_resp.refresh_token,
                    expires_in=validated_resp.expires_in,
                    expires_at=datetime.now().astimezone() + timedelta(seconds=validated_resp.expires_in),
                )
                return token
        except asyncio.TimeoutError as e:
            logger.warning(f"Timeout while fetching SumUp access token {e}")
            return None
        except Exception as e:  # pylint: disable=bare-except
            logger.warning(f"Unexpected error while fetching SumUp access token {e}")
            return None


class SumUpApi:

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
                async with session.get(url, params=query, timeout=10) as response:
                    if not response.ok:
                        resp = await response.json()
                        err = _SumUpErrorFormat.model_validate(resp)
                        raise SumUpError(f"SumUp API returned an error: {err.code} - {err.message}")
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
                async with session.post(url, data=data.model_dump_json(), params=query, timeout=10) as response:
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
        url = f"{SUMUP_API_URL}/merchants/{self.merchant_code}/payment-methods"
        try:
            await self._get(url)
            return True
        except Exception:  # pylint: disable=bare-except
            return False

    async def create_sumup_checkout(self, checkout: SumUpCreateCheckout) -> SumUpCheckout:
        resp = await self._post(SUMUP_CHECKOUT_URL, checkout)
        return SumUpCheckout.model_validate(resp)

    async def get_checkout(self, checkout_id: str) -> SumUpCheckout:
        url = f"{SUMUP_CHECKOUT_URL}/{checkout_id}"
        resp = await self._get(url)
        return SumUpCheckout.model_validate(resp)

    async def list_checkouts(self) -> list[SumUpCheckout]:
        resp = await self._get(SUMUP_CHECKOUT_URL)

        if not isinstance(resp, list):
            raise SumUpError("SumUp API returned an invalid response")

        return [SumUpCheckout.model_validate(x) for x in resp]

    async def find_checkout(self, order_uuid: uuid.UUID) -> SumUpCheckout | None:
        resp = await self._get(SUMUP_CHECKOUT_URL, {"checkout_reference": str(order_uuid)})

        if not isinstance(resp, list):
            raise SumUpError("SumUp API returned an invalid response")

        if len(resp) != 1:
            raise SumUpError(f"SumUp returned a non-unique checkout for the order uuid {order_uuid}")

        return SumUpCheckout.model_validate(resp[0])

    async def get_transaction(self, foreign_transaction_id: str) -> SumUpTransactionDetail:
        resp = await self._get(
            f"{SUMUP_API_URL}/me/transactions", query={"foreign_transaction_id": foreign_transaction_id}
        )
        return SumUpTransactionDetail.model_validate(resp)

    async def list_transactions(self) -> list[SumUpTransaction]:
        resp = await self._get(f"{SUMUP_API_URL}/me/transactions/history", query={"limit": 10000})
        parsed_resp = SumUpTransactionResp.model_validate(resp)
        return parsed_resp.items
