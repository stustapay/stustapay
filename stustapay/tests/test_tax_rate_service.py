# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa
from stustapay.core.schema.tax_rate import TaxRate, TaxRateWithoutName
from stustapay.core.service.common.error import AccessDenied
from stustapay.core.service.tax_rate import TaxRateService
from .common import BaseTestCase


class TaxRateServiceTest(BaseTestCase):
    async def asyncSetUp(self) -> None:
        await super().asyncSetUp()

        self.tax_rate_service = TaxRateService(
            db_pool=self.db_pool, config=self.test_config, auth_service=self.auth_service
        )

    async def test_basic_tax_rate_workflow(self):
        tax_rates = await self.tax_rate_service.list_tax_rates(token=self.admin_token)
        self.assertEqual(len(tax_rates), 3)

        tax_rate = await self.tax_rate_service.create_tax_rate(
            token=self.admin_token, tax_rate=TaxRate(name="krass", rate=0.5, description="Krasse UST")
        )
        self.assertEqual(tax_rate.name, "krass")

        with self.assertRaises(AccessDenied):
            await self.tax_rate_service.create_tax_rate(
                token=self.cashier_token, tax_rate=TaxRate(name="Krasse UST", rate=0.5, description="Krasse UST")
            )

        updated_tax_rate = await self.tax_rate_service.update_tax_rate(
            token=self.admin_token,
            tax_rate_name=tax_rate.name,
            tax_rate=TaxRateWithoutName(rate=0.6, description="Noch Krassere UST"),
        )
        self.assertEqual(updated_tax_rate.rate, 0.6)
        self.assertEqual(updated_tax_rate.description, "Noch Krassere UST")

        tax_rates = await self.tax_rate_service.list_tax_rates(token=self.admin_token)
        self.assertEqual(len(tax_rates), 4)
        self.assertTrue(updated_tax_rate in tax_rates)

        with self.assertRaises(AccessDenied):
            await self.tax_rate_service.delete_tax_rate(token=self.cashier_token, tax_rate_name=tax_rate.name)

        deleted = await self.tax_rate_service.delete_tax_rate(token=self.admin_token, tax_rate_name=tax_rate.name)
        self.assertTrue(deleted)
