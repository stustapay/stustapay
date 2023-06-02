-- revision: 3af7cc18
-- requires: e2c0985c

drop view cash_register_with_cashier;

create or replace view cash_register_with_cashier as (
    select
        c.*,
        t.id as current_till_id,
        u.id as current_cashier_id,
        u.user_tag_uid as current_cashier_tag_uid,
        coalesce(a.balance, 0) as current_balance
    from cash_register c
    left join usr u on u.cash_register_id = c.id
    left join account a on a.id = u.cashier_account_id
    left join till t on t.active_cash_register_id = c.id
);
