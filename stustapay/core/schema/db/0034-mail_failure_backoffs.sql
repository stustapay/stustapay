-- migration: 6dc876fd
-- requires: c5c2c8aa

alter table mails add column num_retries int not null default 0;
