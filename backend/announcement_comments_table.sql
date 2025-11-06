-- Create announcement_comments table
CREATE TABLE IF NOT EXISTS announcement_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- Can be either student or professor
    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('student', 'professor')),
    content TEXT NOT NULL,
    parent_comment_id UUID REFERENCES announcement_comments(id) ON DELETE CASCADE, -- For nested replies
    is_edited BOOLEAN DEFAULT FALSE,
    edited_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_announcement_comments_announcement_id ON announcement_comments(announcement_id);
CREATE INDEX IF NOT EXISTS idx_announcement_comments_user_id ON announcement_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_announcement_comments_parent_id ON announcement_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_announcement_comments_created_at ON announcement_comments(created_at);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_announcement_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_announcement_comments_updated_at
    BEFORE UPDATE ON announcement_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_announcement_comments_updated_at();
