-- Restrict friendship UPDATE to status column only
-- Prevents users from modifying requester_id, addressee_id, or created_at

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Addressee can update friendship status" ON friendships;

-- Create restricted policy: only status column can be updated
CREATE POLICY "Addressee can update friendship status"
  ON friendships
  FOR UPDATE
  USING (auth.uid() = addressee_id)
  WITH CHECK (
    auth.uid() = addressee_id
    AND status IN ('accepted', 'declined')
  );
