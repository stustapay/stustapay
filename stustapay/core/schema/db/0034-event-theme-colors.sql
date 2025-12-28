-- migration: 0000034
-- requires: 0000033

ALTER TABLE event ADD COLUMN customer_portal_primary_color TEXT;
ALTER TABLE event ADD COLUMN customer_portal_secondary_color TEXT;
