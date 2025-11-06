-- Add created_at and updated_at columns to course_groups table

-- Add created_at column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'course_groups' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE course_groups 
        ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        
        -- Update existing records with a default timestamp
        UPDATE course_groups 
        SET created_at = NOW() 
        WHERE created_at IS NULL;
    END IF;
END $$;

-- Add updated_at column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'course_groups' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE course_groups 
        ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        
        -- Update existing records with a default timestamp
        UPDATE course_groups 
        SET updated_at = NOW() 
        WHERE updated_at IS NULL;
    END IF;
END $$;

-- Create or replace function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_course_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_course_groups_updated_at ON course_groups;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_course_groups_updated_at
    BEFORE UPDATE ON course_groups
    FOR EACH ROW
    EXECUTE FUNCTION update_course_groups_updated_at();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_course_groups_created_at ON course_groups(created_at);
CREATE INDEX IF NOT EXISTS idx_course_groups_updated_at ON course_groups(updated_at);

COMMENT ON COLUMN course_groups.created_at IS 'Timestamp when the group was created';
COMMENT ON COLUMN course_groups.updated_at IS 'Timestamp when the group was last updated';