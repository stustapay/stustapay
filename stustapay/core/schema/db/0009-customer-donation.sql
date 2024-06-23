-- migration: dc0af35b
-- requires: ce7d9f30

alter table customer_info add column donation numeric default 0.0;
