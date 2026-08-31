-- Optional schema additions that make the Settings notification-preferences
-- feature and the /update-patient-record clinical-notes feature functional.
-- Run in the Supabase SQL Editor once.

-- Patients: clinical notes append into medical_history (TEXT)
ALTER TABLE patients ADD COLUMN IF NOT EXISTS medical_history TEXT;

-- Patients: current medications (read-only in workflow, stored as TEXT)
ALTER TABLE patients ADD COLUMN IF NOT EXISTS current_medications TEXT;

-- Users: notification-preferences toggles from the Settings page (JSONB)
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{}'::jsonb;
