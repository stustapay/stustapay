# based on https://github.com/pretix/python-dsfinvk, Coypright rami.io GmbH, Apache Lizenz
# with modifications by StuStaPay, 2023

import collections
import sys
from collections import OrderedDict
from typing import no_type_check

from .fields import Field


class BaseTableMeta(type):
    @classmethod
    def __prepare__(self, name, bases):
        del name  # make pylint happy
        del bases
        return collections.OrderedDict()

    @no_type_check
    def __new__(mcls, name, bases, attrs):
        cls = super(BaseTableMeta, mcls).__new__(mcls, name, bases, attrs)
        fields = list(cls._fields) if hasattr(cls, "_fields") else []
        for attr, obj in attrs.items():
            if isinstance(obj, Field):
                if sys.version_info < (3, 6):
                    obj.__set_name__(cls, attr)
                fields.append(obj)
        cls._fields = fields
        return cls


class Model(metaclass=BaseTableMeta):
    @no_type_check
    def __init__(self, **kwargs):
        self.data = OrderedDict([(f.name, f.default) for f in self._fields])  # pylint: disable=no-member
        for k, v in kwargs.items():
            setattr(self, k, v)

    @property
    def filename(self):
        raise NotImplementedError
