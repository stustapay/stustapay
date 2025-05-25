-- migration: c5c2c8aa
-- requires: b81c90f4

create type pending_order_payment_type as enum ('sumup_terminal', 'sumup_online');

alter table pending_sumup_order add column payment_type pending_order_payment_type not null default 'sumup_online';
alter table pending_sumup_order alter column payment_type drop default;
