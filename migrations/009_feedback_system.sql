
-- Feedback system migration
CREATE TABLE IF NOT EXISTS feedback (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now(),
    user_id uuid NULL,
    email text NULL,
    type text NOT NULL CHECK (type IN ('Bug', 'Feature', 'Question')),
    severity text NOT NULL CHECK (severity IN ('Critical', 'High', 'Medium', 'Low')),
    message text NOT NULL,
    metadata jsonb NULL,
    screenshot_url text NULL,
    status text NOT NULL DEFAULT 'New' CHECK (status IN ('New', 'Triaged', 'In Progress', 'Resolved', 'Closed'))
);

-- Enable RLS
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own feedback
CREATE POLICY "users_can_insert_feedback" ON feedback
    FOR INSERT 
    WITH CHECK (true);

-- Policy: Users can select their own feedback
CREATE POLICY "users_can_select_own_feedback" ON feedback
    FOR SELECT
    USING (user_id = auth.uid());

-- Policy: Admins can select all feedback (assuming admin role claim)
CREATE POLICY "admins_can_select_all_feedback" ON feedback
    FOR SELECT
    USING (auth.jwt() ->> 'role' = 'admin');

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
