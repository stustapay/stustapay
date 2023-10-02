from typing import Callable

from stustapay.core.schema.tse import Tse, TseType

from .diebold_nixdorf_usb.config import DieboldNixdorfUSBTSEConfig
from .diebold_nixdorf_usb.handler import DieboldNixdorfUSBTSE
from .handler import TSEHandler


def get_tse_handler(tse: Tse) -> Callable[[], TSEHandler]:
    if tse.type == TseType.diebold_nixdorf:
        cfg = DieboldNixdorfUSBTSEConfig(
            serial_number=tse.serial, password=tse.password, ws_url=tse.ws_url, ws_timeout=tse.ws_timeout
        )
        return lambda: DieboldNixdorfUSBTSE(tse.name, cfg)

    raise RuntimeError("Unknown tse type")
