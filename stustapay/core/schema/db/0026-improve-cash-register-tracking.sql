-- migration: 395fe4fd
-- requires: 0e8a849d

alter table cashier_shift add column cash_register_id bigint references cash_register(id);

insert into order_type (name) values ('cashier_shift_start'), ('cashier_shift_end');
