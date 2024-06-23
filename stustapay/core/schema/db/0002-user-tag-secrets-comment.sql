-- migration: 66c577ad
-- requires: b71733fb

alter table user_tag_secret add column description text;
