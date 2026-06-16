-- migration: 2ad79bb3
-- requires: 0050-shared-online-topup.sql

alter table event
    add column group_topup_enabled bool not null default false;
