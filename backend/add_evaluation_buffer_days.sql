-- Add evaluation_buffer_days column to projects table
-- This column stores the number of days before the project due date that students have for evaluation

ALTER TABLE "public"."projects" 
ADD COLUMN IF NOT EXISTS "evaluation_buffer_days" INTEGER DEFAULT 0;

-- Update existing projects to have a default value (you can adjust this as needed)
UPDATE "public"."projects" 
SET "evaluation_buffer_days" = 0 
WHERE "evaluation_buffer_days" IS NULL;

-- Add comment to explain the column
COMMENT ON COLUMN "public"."projects"."evaluation_buffer_days" IS 'Number of days before project due date allocated for student evaluation (e.g., 2 days means evaluation must be completed 2 days before project due date)';

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'projects' AND column_name = 'evaluation_buffer_days';
