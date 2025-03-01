from stustapay.core.schema.product import ProductRestriction


def find_oldest_customer(customers: dict[int, tuple[float, str | None]]) -> int:
    oldest_customer = None
    for account_id, restriction in customers.items():
        if oldest_customer is None:
            oldest_customer = (account_id, restriction)
            if restriction is None:
                return oldest_customer[0]
            continue
        if restriction is None:
            return account_id

        if oldest_customer[1] == ProductRestriction.under_16.name and restriction == ProductRestriction.under_18.name:
            oldest_customer = (account_id, restriction)

    assert oldest_customer is not None

    return oldest_customer[0]
