-- migration: 0000028
-- requires: 546c41ca

-- Add is_vip flag to user_tag table
ALTER TABLE user_tag ADD COLUMN IF NOT EXISTS is_vip BOOLEAN NOT NULL DEFAULT FALSE;

-- Add vip_max_account_balance to event table
ALTER TABLE event ADD COLUMN IF NOT EXISTS vip_max_account_balance NUMERIC NOT NULL DEFAULT 300;

