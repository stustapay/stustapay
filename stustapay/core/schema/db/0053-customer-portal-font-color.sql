-- migration: a6f94d21
-- requires: 13c7b823

alter table event add column customer_portal_font_color text default null;
