from dataclasses import dataclass

import asyncpg

from stustapay.core.config import Config
from stustapay.core.schema.order import PendingLineItem
from stustapay.core.schema.product import Product
from stustapay.core.service.auth import AuthService
from stustapay.core.service.common.dbservice import DBService


@dataclass
class VoucherUsage:
    used_vouchers: int
    additional_line_items: list[PendingLineItem]


class VoucherService(DBService):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service

    def compute_optimal_voucher_usage(
        self, max_vouchers: int, line_items: list[PendingLineItem], discount_product: Product
    ) -> VoucherUsage:
        if max_vouchers == 0:
            return VoucherUsage(used_vouchers=0, additional_line_items=[])

        used_vouchers = 0
        additional_line_items = []
        line_items_by_price_per_voucher = list(
            sorted(line_items, key=lambda x: (x.product.price_per_voucher is None, x.product.price_per_voucher))
        )
        for current_line_item in line_items_by_price_per_voucher:
            if used_vouchers >= max_vouchers:
                break
            remaining_vouchers = max_vouchers - used_vouchers

            if (
                current_line_item.product.price_in_vouchers is None
                or current_line_item.product.price_per_voucher is None
            ):
                continue
            vouchers_for_product = min(
                remaining_vouchers, current_line_item.product.price_in_vouchers * current_line_item.quantity
            )

            price_deduction = current_line_item.product.price_per_voucher * vouchers_for_product

            additional_line_items.append(
                PendingLineItem(
                    product=discount_product,
                    tax_rate=current_line_item.tax_rate,
                    tax_name=current_line_item.tax_name,
                    product_price=-price_deduction,
                    quantity=1,
                )
            )
            used_vouchers += vouchers_for_product

        return VoucherUsage(used_vouchers=used_vouchers, additional_line_items=additional_line_items)
