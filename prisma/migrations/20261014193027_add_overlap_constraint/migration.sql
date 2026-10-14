-- Create extension for exclusion constraints
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Enforce end_time > start_time check constraint
ALTER TABLE "Reservation"
ADD CONSTRAINT check_end_after_start
CHECK ("endTime" > "startTime");

-- Enforce exclusion constraint: no overlapping active (CONFIRMED) reservations for the same resource
-- Half-open interval '[)' ensures back-to-back reservations (e.g. 10:00-11:00 and 11:00-12:00) are allowed.
ALTER TABLE "Reservation"
ADD CONSTRAINT no_overlapping_reservations
EXCLUDE USING gist (
  "resourceId" WITH =,
  tstzrange("startTime", "endTime", '[)') WITH &&
)
WHERE (status = 'CONFIRMED');