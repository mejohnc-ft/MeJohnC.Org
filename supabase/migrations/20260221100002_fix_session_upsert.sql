-- Fix agent session auto-creation
-- The frontend generates a sessionId via crypto.randomUUID() and inserts commands
-- referencing it, but never creates an agent_sessions row first. The existing
-- update_session_message_count trigger tries to UPDATE a session that doesn't exist,
-- so the message_count never increments and there's no session record.
-- Fix: Replace with an UPSERT that creates the session if missing.

CREATE OR REPLACE FUNCTION update_session_message_count()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO agent_sessions (id, user_id, user_email, message_count, last_message_at)
  VALUES (NEW.session_id, NEW.user_id, NEW.user_email, 1, now())
  ON CONFLICT (id) DO UPDATE SET
    message_count = agent_sessions.message_count + 1,
    last_message_at = now(),
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
