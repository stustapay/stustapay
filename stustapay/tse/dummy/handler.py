from pydantic import BaseModel

from ..handler import TSEHandler


class DummyTSEConfig(BaseModel):
    dummy_backing_file: str

    def make(self):
        return DummyTSE(self)


class DummyTSE(TSEHandler):
    def __init__(self, config: DummyTSEConfig):
        self.backing_file = config.dummy_backing_file
