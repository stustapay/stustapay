from stustapay.core.schema.order import CustomerRegistration
from stustapay.core.schema.product import ProductRestriction


def find_oldest_customer(customers: list[CustomerRegistration]) -> int:
    oldest_customer: CustomerRegistration | None = None
    for customer in customers:
        if customer.restriction is None:
            return customer.account_id

        if oldest_customer is None:
            oldest_customer = customer
            continue

        # hacky way since we only have 3 states
        # if needed, better define a ordering for restrictions :)
        if (
            oldest_customer.restriction == ProductRestriction.under_16.name
            and customer.restriction == ProductRestriction.under_18.name
        ):
            oldest_customer = customer

    assert oldest_customer is not None

    return oldest_customer.account_id
