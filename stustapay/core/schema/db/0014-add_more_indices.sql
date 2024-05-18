-- revision: 45c19bb1
-- requires: 43408ac4

drop index ordr_order_type_till_id_cancels_order_customer_account_id_p_idx;
create index on ordr (order_type);
create index on ordr (till_id);
create index on ordr (customer_account_id);
create index on ordr (cashier_id);
