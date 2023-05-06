"""
configuration options for diebold usb tses
"""

from pydantic import BaseModel


class DieboldNixdorfUSBTSEConfig(BaseModel):
    serial_number: str
    password: str
    ws_url: str
    ws_timeout: float = 5

    def factory(self, name: str):
        from .handler import DieboldNixdorfUSBTSE

        return DieboldNixdorfUSBTSE(name, self)
