-- Optional specific start time for activities (#789)
-- Lets users order activities within a time slot by clock time.
-- Nullable: existing and untimed activities keep working (sorted after timed ones).
ALTER TABLE activities ADD COLUMN start_time TIME;
