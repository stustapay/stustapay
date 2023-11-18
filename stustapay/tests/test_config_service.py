# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa
from stustapay.core.service.config import ConfigService


async def test_get_public_config(config_service: ConfigService):
    public_config = await config_service.get_public_config()
    assert public_config is not None
