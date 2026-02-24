-- Add wallet_group column to participants
-- This is the grouping tag that will replace the families table.
-- Participants with the same wallet_group share a wallet (settle as a unit).
ALTER TABLE participants ADD COLUMN wallet_group TEXT;
