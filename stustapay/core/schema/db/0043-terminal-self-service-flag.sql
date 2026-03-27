-- migration: 0000043
-- requires: 0000042

alter table terminal add column self_service boolean not null default false;
