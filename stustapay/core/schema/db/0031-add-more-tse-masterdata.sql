-- migration: b81c90f4
-- requires: 7b3d1202

alter table tse add column TSEDescription text;
alter table tse add column CertificateDate text;
alter table tse add column first_operation timestamptz;
