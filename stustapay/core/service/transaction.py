import logging
from typing import Optional

from ..dbservice import DBService
from ..schema.transaction import NewTransaction, Transaction, TransactionBooking


logger = logging.getLogger(__name__)


class TransactionService(DBService):
    async def create_transaction(self, transaction: NewTransaction) -> Transaction:
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                transaction_id: int = await conn.fetchval(
                    "insert into transaction (status) values ('pending') returning id"
                )

                count = 0
                for item in transaction.positions:
                    item_id = item.product_id
                    item_quantity = item.quantity

                    cost = await conn.fetchrow(
                        "select "
                        "    product.price, "
                        "    tax.rate, "
                        "    tax.name "
                        "from product "
                        "    left join tax on (tax.name = product.tax) "
                        "where product.id = $1;",
                        item_id,
                    )

                    if cost is None:
                        raise Exception("product not found")

                    price, tax_rate, tax_name = cost

                    await conn.fetchval(
                        "insert into lineitem ("
                        "    txid, itemid, productid, "
                        "    quantity, price, "
                        "    tax_name, tax_rate) "
                        "values ($1, $2, $3, $4, $5, $6, $7)",
                        transaction_id,
                        count,
                        item_id,
                        item_quantity,
                        price,
                        tax_name,
                        tax_rate,
                    )
                    count += 1

                await conn.execute(
                    "update transaction set itemcount = $1 where id = $2;",
                    count,
                    transaction_id,
                )

                return Transaction(transaction_id)

    async def show_transaction(self, transaction_id: int):
        """
        get all info about a transaction.
        """
        del transaction_id
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                raise NotImplementedError()

    async def transaction_payment_info(self, transaction_id: int):
        """
        try to pay a pending transaction, so one can see the available payment options.
        """
        del transaction_id
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                raise NotImplementedError()

    async def book_transaction(self, transaction_id: int, source_account_id: int, target_account_id: int):
        """
        apply the transaction after all payment has been settled.
        """
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                status: Optional[str] = await conn.fetchval(
                    "select status from transaction where transaction.id = $1;",
                    transaction_id,
                )

                if status is None:
                    raise Exception("transaction not found")

                if status != "pending":
                    raise Exception("transaction not in pending state")

                # current available funds of source
                source_old_funds: Optional[float] = await conn.fetchval(
                    "select balance from account where account.id = $1",
                    source_account_id,
                )

                # target account funds
                target_old_funds: Optional[float] = await conn.fetchval(
                    "select balance from account where account.id = $1",
                    target_account_id,
                )

                if source_old_funds is None:
                    raise Exception("source account not found")

                if target_old_funds is None:
                    raise Exception("target account not found")

                # all teh moneyz
                transaction_value = await conn.fetchrow(
                    "select "
                    "    tv.value_sum, "
                    "    tv.value_tax, "
                    "    tv.value_notax "
                    "from transaction_value tv "
                    "    where tv.id = $1;",
                    transaction_id,
                )

                if transaction_value is None:
                    raise Exception("empty transaction")
                transaction_sum, transaction_tax, transaction_notax = transaction_value

                if source_old_funds < transaction_sum:
                    raise Exception(f"not enough funds: {source_old_funds} < {transaction_sum} needed")

                # subtract from payer's account
                # book to destination account
                source_new_funds = source_old_funds - transaction_sum
                target_new_funds = target_old_funds + transaction_sum

                # set new funds to source
                assert source_account_id == conn.fetchval(
                    "update account set balance = $1 where id = $2 returning id;",
                    source_new_funds,
                    source_account_id,
                )

                # and to target
                assert target_account_id == conn.fetchval(
                    "update account set balance = $1 where id = $2 returning id;",
                    target_new_funds,
                    target_account_id,
                )

                # mark the transaction as done
                await conn.fetchval(
                    "update transaction "
                    "    set source_account = $1, "
                    "    target_account = $2, "
                    "    finished_at = now(), "
                    "    status = 'done' "
                    "where transaction.id = $3;",
                    source_account_id,
                    target_account_id,
                    transaction_id,
                )

                return TransactionBooking(
                    value_sum=transaction_sum,
                    value_tax=transaction_tax,
                    value_notax=transaction_notax,
                )

    async def cancel_transaction(self, transaction_id: int):
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                status: Optional[str] = await conn.fetchval(
                    "select status from transaction where transaction.id = $1;",
                    transaction_id,
                )

                if status is None:
                    raise Exception("transaction not found")

                if status != "pending":
                    raise Exception("transaction not in pending state")

                # mark the transaction as cancelled
                await conn.fetchval(
                    "update transaction "
                    "    set finished_at = now(), "
                    "    status = 'cancelled' "
                    "where transaction.id = $1;",
                    transaction_id,
                )
