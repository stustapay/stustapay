# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa
from stustapay.core import database
from stustapay.core.service.cashier import CashierService, CloseOut
from .common import BaseTestCase


class CashierServiceTest(BaseTestCase):
    async def asyncSetUp(self) -> None:
        await super().asyncSetUp()

        self.cashier_service = CashierService(
            db_pool=self.db_pool, config=self.test_config, auth_service=self.auth_service
        )

        await database.add_data(self.db_pool)

    async def test_cashier_close_out(self):
        cashier = await self.cashier_service.get_cashier(token=self.admin_token, cashier_id=0)
        actual_balance = 458.2
        close_out_result = await self.cashier_service.close_out_cashier(
            token=self.admin_token,
            cashier_id=0,
            close_out=CloseOut(comment="Some comment", actual_cash_drawer_balance=actual_balance),
        )
        self.assertEqual(close_out_result.imbalance, actual_balance - cashier.cash_drawer_balance)

        shifts = await self.cashier_service.get_cashier_shifts(token=self.admin_token, cashier_id=0)
        self.assertEqual(len(shifts), 1)
