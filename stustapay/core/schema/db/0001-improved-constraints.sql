-- migration: b71733fb
-- requires: 62df6b55

alter table cash_register_stocking add constraint cash_register_stocking_name_unique unique (name);
alter table cash_register add constraint cash_register_name_unique unique (name);
