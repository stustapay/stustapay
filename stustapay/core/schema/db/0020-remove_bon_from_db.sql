-- migration: 4e2c75a7
-- requires: 9a962cb1

alter table bon drop column content;
alter table bon drop column mime_type;
alter table bon drop column error;
alter table bon drop column generated;
alter table bon add column bon_json json;
alter table bon add column bon_version int default 1;
alter table bon add column cleaned_up bool default false;
update bon set cleaned_up = true;