-- migration: b81c90f4
-- requires: 7b3d1202

alter table tse add column tse_description text;
alter table tse add column certificate_date text;
alter table tse add column first_operation timestamptz;
