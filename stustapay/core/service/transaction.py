from typing import Optional

from stustapay.framework.database import Connection


async def book_transaction(
    *,
    conn: Connection,
    source_account_id: int,
    target_account_id: int,
    conducting_user_id: Optional[int] = None,
    amount: float = 0,
    voucher_amount: int = 0,
    description: str = "",
    order_id: Optional[int] = None,
) -> int:
    return await conn.fetchval(
        "select * from book_transaction("
        "   order_id => $1,"
        "   description => $2,"
        "   source_account_id => $3,"
        "   target_account_id => $4,"
        "   amount => $5,"
        "   vouchers_amount => $6,"
        "   conducting_user_id => $7)",
        order_id,
        description,
        source_account_id,
        target_account_id,
        amount,
        voucher_amount,
        conducting_user_id,
    )
