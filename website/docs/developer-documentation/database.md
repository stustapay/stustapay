---
sidebar_position: 3
---

# Database

To create a new database migration run

```bash
sftkit create-migration <new-migration-name>
```

## Reverting a Ticket Sale

For testing (ticket sales, order, ...),
this is how a sold ticket and all its orders can be deleted:

```sql
with tags as (
    select id from user_tag where pin='tag-pin'
), accounts as (
    select id from account where user_tag_id in (select * from tags)
), orders as (
    select id from ordr where customer_account_id in (select * from accounts)
), deleted_customers as (
    delete from customer_info where customer_account_id in (select * from accounts)
), deleted_transactions as (
    delete from transaction where order_id in (select * from orders)
), deleted_line_items as (
    delete from line_item where order_id in (select * from orders)
), deleted_tse_sigs as (
    delete from tse_signature where id in (select * from orders)
), deleted_orders as (
    delete from ordr where customer_account_id in (select * from accounts)
)
delete from account where id in (select * from accounts);
```
