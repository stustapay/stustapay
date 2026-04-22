-- migration: 0000046
-- requires: 0000045

alter type pending_order_type add value if not exists 'sale';
