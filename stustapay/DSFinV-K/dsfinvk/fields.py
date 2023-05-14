import re
from datetime import date, datetime
from decimal import ROUND_HALF_UP, Decimal

import pytz


class Field:
    def __init__(self, required=False, default=None, _d=None):
        self.required = required
        self.default = default
        self.__doc__ = _d
        super().__init__()

    def __get__(self, instance, objtype):
        if instance._data.get(self.name, None) is None:
            instance._data[self.name] = self.default
        return instance._data[self.name]

    def __set__(self, instance, value):
        raise AttributeError("Read-only!")

    def __delete__(self, instance):
        del instance._data[self.name]

    def __set_name__(self, owner, name):
        self.name = name


class StringField(Field):
    def __init__(self, max_length=None, regex=None, *args, **kwargs):
        self.max_length = max_length
        self.regex = re.compile(regex) if regex else None
        super().__init__(*args, **kwargs)

    def __set__(self, instance, value):
        # TODO: Make it configurable if this should raise an error
        #if self.max_length and len(value) > self.max_length:
        #    raise ValueError("Value for {} is longer than {} characters.".format(self.name, self.max_length))
        if self.regex and not self.regex.match(value):
            raise ValueError("Value {} for {} does not have the valid format.".format(value, self.name))
        instance._data[self.name] = value


class NumericField(Field):
    def __init__(self, places=0, *args, **kwargs):
        self.places = places
        super().__init__(*args, **kwargs)

    def __set__(self, instance, value):
        if not isinstance(value, (Decimal, int)):
            raise TypeError("Value is not a decimal or int")
        if isinstance(value, int):
            value = Decimal(value)
        if self.places > 0:
            instance._data[self.name] = ('{:,.%df}' % self.places).format(value.quantize(
                Decimal('1') / 10 ** self.places, ROUND_HALF_UP
            )).translate({ord(','): '.', ord('.'): ','})
        else:
            instance._data[self.name] = '{:,d}'.format(int(value)).replace(',', '.')


class BooleanField(Field):
    def __set__(self, instance, value):
        if not isinstance(value, bool):
            raise TypeError("Value is not a boolean")
        instance._data[self.name] = "1" if value else "0"


class DateField(Field):
    def __set__(self, instance, value):
        if not isinstance(value, date):
            raise TypeError("Value is not a date")
        instance._data[self.name] = value.isoformat()


class LocalDateTimeField(Field):
    def __set__(self, instance, value):
        if not isinstance(value, datetime):
            raise TypeError("Value is not a datetime")
        if value.utcoffset() is None:
            raise TypeError("Value is not timezone-aware")
        instance._data[self.name] = value.strftime('%Y-%m-%dT%H:%M:%S')


class ISODateTimeField(Field):
    def __set__(self, instance, value):
        if not isinstance(value, datetime):
            raise TypeError("Value is not a datetime")
        if value.utcoffset() is None:
            raise TypeError("Value is not timezone-aware")
        instance._data[self.name] = value.astimezone(pytz.UTC).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
