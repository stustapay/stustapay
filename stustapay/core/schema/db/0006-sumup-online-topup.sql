-- migration: 90c7d52c
-- requires: 3af7cc18

alter table customer_sumup_checkout drop column return_url;
alter table customer_sumup_checkout add column last_checked timestamptz;
alter table customer_sumup_checkout add column check_interval bigint not null default 1;
alter table ordr alter column till_id set not null;