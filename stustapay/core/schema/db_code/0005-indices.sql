-- Stats and performance indices
create index if not exists ordr_booked_at_idx on ordr (booked_at);
create index if not exists ordr_till_id_booked_at_idx on ordr (till_id, booked_at);
create index if not exists ordr_payment_method_booked_at_idx on ordr (payment_method, booked_at);
create index if not exists transaction_booked_at_source_target_idx on transaction (booked_at, source_account, target_account);
create index if not exists line_item_product_id_order_id_idx on line_item (product_id, order_id);
