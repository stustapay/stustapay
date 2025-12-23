-- migration: event_banner
-- requires: 0032-headwind-terminal-mapping

-- Add banner image support for events in customer portal
alter table event add column banner_image bytea;
alter table event add column banner_image_mime_type text;
