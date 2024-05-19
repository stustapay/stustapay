CURRENCIES = {"EUR": "€"}


def get_currency_symbol(currency_identifier: str) -> str:
    return CURRENCIES[currency_identifier]
