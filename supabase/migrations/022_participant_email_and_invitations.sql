-- Migration 022: Participant email + invitations + email_log

-- 1. Add email column to participants
ALTER TABLE participants ADD COLUMN email TEXT;

-- 2. Invitations table
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  inviter_id UUID REFERENCES auth.users(id),
  token TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted')),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_participant ON invitations(participant_id);

-- 3. Email audit log (written by edge function via service role)
CREATE TABLE email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
  invitation_id UUID REFERENCES invitations(id) ON DELETE SET NULL,
  email_type TEXT NOT NULL, -- 'invitation' | 'payment_reminder'
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  status TEXT NOT NULL DEFAULT 'sent', -- 'sent' | 'failed'
  resend_message_id TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

-- RLS on invitations
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Anyone can look up an invitation by token (join page — no auth required)
CREATE POLICY "Anyone can read invitations" ON invitations
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create invitations" ON invitations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update invitations" ON invitations
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- RLS on email_log: service role only (no browser access)
ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only on email_log" ON email_log FOR ALL USING (false);
