-- Fix tasks table to use timestamp without time zone (like project_phases)
-- This ensures dates are stored in local timezone, not UTC

-- Step 1: Add new columns with correct data type
ALTER TABLE tasks
ADD COLUMN due_date_new timestamp without time zone,
ADD COLUMN available_until_new timestamp without time zone;

-- Step 2: Copy data from old columns to new columns (converts from UTC to naive local time)
UPDATE tasks
SET 
  due_date_new = due_date AT TIME ZONE 'Asia/Manila',
  available_until_new = available_until AT TIME ZONE 'Asia/Manila';

-- Step 3: Drop old columns
ALTER TABLE tasks
DROP COLUMN due_date,
DROP COLUMN available_until;

-- Step 4: Rename new columns to original names
ALTER TABLE tasks
RENAME COLUMN due_date_new TO due_date;

ALTER TABLE tasks
RENAME COLUMN available_until_new TO available_until;

-- Verify the change
SELECT 
  id,
  title,
  due_date,
  available_until
FROM tasks
LIMIT 5;
