-- migration: b81c90f4
-- requires: 3a6d80b4

alter table tse add column tse_description text;
alter table tse add column certificate_date text;
alter table tse add column first_operation timestamptz;

create table dsfinvk_metadata (
    instance_model uuid primary key not null default gen_random_uuid(),
    instance_brand text not null default 'StuStaPay',
    instance_software_brand text not null default 'StuStaPay'
);

insert into dsfinvk_metadata default values;


create or replace function get_default_till_dsfinvk_brand()
returns text
as $$
    select instance_brand from dsfinvk_metadata;
$$ language sql
    set search_path = "$user", public;

create or replace function get_default_till_dsfinvk_model()
returns uuid
as $$
    select instance_model from dsfinvk_metadata;
$$ language sql
    set search_path = "$user", public;

create or replace function get_default_till_dsfinvk_software_brand()
returns text
as $$
    select instance_software_brand from dsfinvk_metadata;
$$ language sql
    set search_path = "$user", public;

alter table till add column dsfinvk_brand text not null default get_default_till_dsfinvk_brand();
alter table till add column dsfinvk_model uuid not null default get_default_till_dsfinvk_model();
alter table till add column dsfinvk_software_brand text not null default get_default_till_dsfinvk_software_brand();
