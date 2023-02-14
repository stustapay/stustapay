"""
configuration options for diebold usb tses
"""

from pydantic import BaseModel


class DieboldNixdorfUSBTSEConfig(BaseModel):
    diebold_nixdorf_usb_ws_url: str

    def make(self):
        return DieboldNixdorfUSBTSE(self)
