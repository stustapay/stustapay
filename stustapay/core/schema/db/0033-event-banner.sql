-- migration: 0000033
-- requires: 0000032

-- Add banner image support for events in customer portal
alter table event add column banner_image bytea;
alter table event add column banner_image_mime_type text;
