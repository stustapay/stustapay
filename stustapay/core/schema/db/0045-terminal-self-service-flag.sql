-- migration: 0000045
-- requires: 0000044

alter table terminal add column if not exists self_service boolean not null default false;
