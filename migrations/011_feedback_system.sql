-- Feedback system migration
-- Create feedback table for user feedback and support requests

CREATE TABLE IF NOT EXISTS feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  user_id uuid NULL, -- Can be null for anonymous feedback
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

-- Policy: Users can insert their own feedback (authenticated or not)
CREATE POLICY "users_can_insert_feedback" ON feedback
  FOR INSERT 
  WITH CHECK (true); -- No restriction on insert

-- Policy: Users can select their own feedback
CREATE POLICY "users_can_select_own_feedback" ON feedback
  FOR SELECT
  USING (user_id = auth.uid() OR user_id IS NULL);

-- Policy: Admins can select all feedback (when we implement admin roles)
-- For now, we'll add this when role system is enhanced
-- CREATE POLICY "admins_can_select_all_feedback" ON feedback
--   FOR SELECT
--   USING (auth.jwt() ->> 'role' = 'admin');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_type_severity ON feedback(type, severity);

-- Create feedback-shots storage bucket (will be created via code)
-- This is just for documentation
-- INSERT INTO storage.buckets (id, name, public) VALUES ('feedback-shots', 'feedback-shots', true);