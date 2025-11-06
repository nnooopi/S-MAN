-- Admin accounts table for S-MAN system (using Supabase Auth integration)
CREATE TABLE IF NOT EXISTS adminaccounts (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS (Row Level Security) policies for admin table
ALTER TABLE adminaccounts ENABLE ROW LEVEL SECURITY;

-- Policy to allow admins to read their own data
CREATE POLICY "Admins can view own data" ON adminacounts
    FOR SELECT USING (auth.uid() = id);

-- Policy to allow service role to manage admin accounts
CREATE POLICY "Service role can manage admin accounts" ON adminaccounts
    FOR ALL USING (auth.role() = 'service_role');

-- Create a function to update the updated_at timestamp (if not already exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_adminaccounts_updated_at 
    BEFORE UPDATE ON adminaccounts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_admin_email ON adminaccounts(email);

-- Note: Admin accounts will be created using the create_admin.js script
-- This creates both the Supabase Auth user and the admin profile