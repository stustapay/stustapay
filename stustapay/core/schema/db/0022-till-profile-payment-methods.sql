-- migration: 7e81cbb1
-- requires: e2c67010

alter table till_profile add column enable_ssp_payment boolean not null default true;
alter table till_profile add column enable_cash_payment boolean not null default false;
alter table till_profile add column enable_card_payment boolean not null default false;

