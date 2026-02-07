-- migration: 0000037
-- requires: 0000036

-- Add expected visitors per day field to event for revenue prediction
-- This simple field allows admins to configure average expected daily visitors
-- for more accurate revenue predictions based on revenue-per-visitor calculations

ALTER TABLE event ADD COLUMN IF NOT EXISTS expected_visitors_per_day INT;

COMMENT ON COLUMN event.expected_visitors_per_day IS 'Expected average number of visitors per day for revenue prediction';
