-- Fix is_active column type and values for course_group_members
-- This script converts string 'true'/'false' values to proper booleans

-- UPDATE course_group_members table
UPDATE "public"."course_group_members"
SET "is_active" = CAST('true' AS BOOLEAN)
WHERE "is_active"::text = 'true';

UPDATE "public"."course_group_members"
SET "is_active" = CAST('false' AS BOOLEAN)
WHERE "is_active"::text = 'false' OR "is_active" IS NULL;

-- Verify the update
SELECT id, student_id, group_id, is_active, pg_typeof(is_active) as column_type
FROM "public"."course_group_members"
LIMIT 5;
