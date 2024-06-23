-- migration: d1dd53bd
-- requires: 45c01608

alter table event add column sumup_oauth_client_id text not null default '';
alter table event add column sumup_oauth_client_secret text not null default '';
alter table event add column sumup_oauth_refresh_token text not null default '';
