-- migration: 0000033
-- requires: 0000032

-- Add customization options for events in customer portal
alter table event add column banner_image bytea;
alter table event add column banner_image_mime_type text;
ALTER TABLE event ADD COLUMN customer_portal_primary_color TEXT;
ALTER TABLE event ADD COLUMN customer_portal_secondary_color TEXT;
ALTER TABLE event ADD COLUMN customer_portal_background_color TEXT DEFAULT NULL;
