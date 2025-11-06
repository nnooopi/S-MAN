-- Create announcement_files table
CREATE TABLE IF NOT EXISTS announcement_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    uploaded_by UUID NOT NULL, -- Can be either student or professor
    uploaded_by_type VARCHAR(20) NOT NULL CHECK (uploaded_by_type IN ('student', 'professor')),
    is_image BOOLEAN DEFAULT FALSE,
    image_width INTEGER,
    image_height INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_announcement_files_announcement_id ON announcement_files(announcement_id);
CREATE INDEX IF NOT EXISTS idx_announcement_files_uploaded_by ON announcement_files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_announcement_files_file_type ON announcement_files(file_type);
CREATE INDEX IF NOT EXISTS idx_announcement_files_is_image ON announcement_files(is_image);
