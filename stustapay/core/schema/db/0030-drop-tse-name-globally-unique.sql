-- migration: 7b3d1202
-- requires: 1798370e

alter table tse drop constraint if exists tse_tse_name_key;
