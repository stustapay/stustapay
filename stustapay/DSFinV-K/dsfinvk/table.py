import collections
import sys
from collections import OrderedDict

from .fields import Field


class BaseTableMeta(type):
    @classmethod
    def __prepare__(self, name, bases):
        return collections.OrderedDict()

    def __new__(mcls, name, bases, attrs):
        cls = super(BaseTableMeta, mcls).__new__(mcls, name, bases, attrs)
        fields = list(cls._fields) if hasattr(cls, '_fields') else []
        for attr, obj in attrs.items():
            if isinstance(obj, Field):
                if sys.version_info < (3, 6):
                    obj.__set_name__(cls, attr)
                fields.append(obj)
        cls._fields = fields
        return cls


class Model(metaclass=BaseTableMeta):

    def __init__(self, **kwargs):
        self._data = OrderedDict([
            (f.name, f.default) for f in self._fields
        ])
        for k, v in kwargs.items():
            setattr(self, k, v)

    @property
    def _filename(self):
        raise NotImplementedError
