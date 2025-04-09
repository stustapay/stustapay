-- migration: 0000031
-- requires: 0000030

alter table event add column if not exists donation_enabled boolean default true not null; 