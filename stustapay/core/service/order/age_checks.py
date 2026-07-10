from stustapay.core.schema.order import CustomerRegistration


def find_oldest_customer(customers: list[CustomerRegistration]) -> int:
    oldest_customer: CustomerRegistration | None = None
    for customer in customers:
        if not customer.user_tag_variant_ids:
            return customer.account_id

        if oldest_customer is None:
            oldest_customer = customer
            continue

        oldest_priority = oldest_customer.max_user_tag_variant_priority or 0
        customer_priority = customer.max_user_tag_variant_priority or 0
        if customer_priority > oldest_priority:
            oldest_customer = customer

    assert oldest_customer is not None

    return oldest_customer.account_id
