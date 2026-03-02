-- ============================================
-- TOOL DEFINITIONS TABLE (#268)
-- Maps Claude tool-use tools to capability_definitions and ACTION_CAPABILITY_MAP actions.
-- Each row defines a tool that the agent-executor can expose to Claude based on
-- an agent's granted capabilities (via agent_skills).
-- ============================================

CREATE TABLE IF NOT EXISTS tool_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT NOT NULL,
  capability_name TEXT NOT NULL REFERENCES capability_definitions(name) ON DELETE CASCADE,
  input_schema JSONB NOT NULL,
  action_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tool_definitions_capability ON tool_definitions(capability_name);
CREATE INDEX IF NOT EXISTS idx_tool_definitions_action ON tool_definitions(action_name);
CREATE INDEX IF NOT EXISTS idx_tool_definitions_active ON tool_definitions(is_active) WHERE is_active = true;

ALTER TABLE tool_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read tool definitions" ON tool_definitions;
CREATE POLICY "Anyone can read tool definitions" ON tool_definitions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage tool definitions" ON tool_definitions;
CREATE POLICY "Admins can manage tool definitions" ON tool_definitions
  FOR ALL USING (is_admin());

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_tool_definitions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tool_definitions_updated_at ON tool_definitions;
CREATE TRIGGER trg_tool_definitions_updated_at
  BEFORE UPDATE ON tool_definitions
  FOR EACH ROW
  EXECUTE FUNCTION update_tool_definitions_updated_at();

-- ============================================
-- SEED TOOL DEFINITIONS
-- One tool per ACTION_CAPABILITY_MAP entry (representative subset).
-- ============================================

INSERT INTO tool_definitions (name, display_name, description, capability_name, input_schema, action_name) VALUES

-- CRM tools
('search_contacts', 'Search Contacts', 'Search CRM contacts by name, email, company, or tags', 'crm',
 '{"type":"object","properties":{"query":{"type":"string","description":"Search query"},"limit":{"type":"integer","description":"Max results","default":10}},"required":["query"]}',
 'query.contacts'),

('create_contact', 'Create Contact', 'Create a new CRM contact', 'crm',
 '{"type":"object","properties":{"first_name":{"type":"string"},"last_name":{"type":"string"},"email":{"type":"string"},"company":{"type":"string"},"contact_type":{"type":"string","enum":["lead","prospect","client","partner","vendor","personal","other"]}},"required":["first_name","last_name"]}',
 'crm.create_contact'),

('update_contact', 'Update Contact', 'Update an existing CRM contact', 'crm',
 '{"type":"object","properties":{"contact_id":{"type":"string","description":"UUID of the contact"},"updates":{"type":"object","description":"Fields to update"}},"required":["contact_id","updates"]}',
 'crm.update_contact'),

-- Knowledge base tools
('search_knowledge_base', 'Search Knowledge Base', 'Search the knowledge base for relevant articles and documents', 'kb',
 '{"type":"object","properties":{"query":{"type":"string","description":"Search query"},"limit":{"type":"integer","default":5}},"required":["query"]}',
 'kb.search'),

('summarize_document', 'Summarize Document', 'Generate a summary of a knowledge base document', 'kb',
 '{"type":"object","properties":{"document_id":{"type":"string","description":"UUID of the document"}},"required":["document_id"]}',
 'kb.summarize'),

-- Email tools
('send_email', 'Send Email', 'Send an email to a recipient', 'email',
 '{"type":"object","properties":{"to":{"type":"string","description":"Recipient email"},"subject":{"type":"string"},"body":{"type":"string"},"cc":{"type":"array","items":{"type":"string"}}},"required":["to","subject","body"]}',
 'email.send'),

('draft_email', 'Draft Email', 'Create an email draft without sending', 'email',
 '{"type":"object","properties":{"to":{"type":"string"},"subject":{"type":"string"},"body":{"type":"string"}},"required":["to","subject","body"]}',
 'email.draft'),

-- Calendar tools
('create_calendar_event', 'Create Calendar Event', 'Schedule a new calendar event', 'calendar',
 '{"type":"object","properties":{"title":{"type":"string"},"start_at":{"type":"string","description":"ISO 8601 start time"},"end_at":{"type":"string","description":"ISO 8601 end time"},"description":{"type":"string"},"location":{"type":"string"}},"required":["title","start_at"]}',
 'calendar.create_event'),

('list_calendar_events', 'List Calendar Events', 'List upcoming calendar events within a date range', 'calendar',
 '{"type":"object","properties":{"start_date":{"type":"string","description":"ISO 8601 start date"},"end_date":{"type":"string","description":"ISO 8601 end date"},"limit":{"type":"integer","default":20}},"required":["start_date"]}',
 'calendar.list_events'),

-- Task tools
('create_task', 'Create Task', 'Create a new task', 'tasks',
 '{"type":"object","properties":{"title":{"type":"string"},"description":{"type":"string"},"priority":{"type":"string","enum":["low","medium","high","urgent"]},"due_date":{"type":"string","description":"ISO 8601 date"}},"required":["title"]}',
 'tasks.create'),

('list_tasks', 'List Tasks', 'List tasks with optional filters', 'tasks',
 '{"type":"object","properties":{"status":{"type":"string","enum":["todo","in_progress","review","done"]},"priority":{"type":"string","enum":["low","medium","high","urgent"]},"limit":{"type":"integer","default":20}}}',
 'tasks.list'),

-- Document tools
('create_document', 'Create Document', 'Create a new document', 'documents',
 '{"type":"object","properties":{"title":{"type":"string"},"content":{"type":"string"},"tags":{"type":"array","items":{"type":"string"}}},"required":["title","content"]}',
 'documents.create'),

('search_documents', 'Search Documents', 'Search documents by query', 'documents',
 '{"type":"object","properties":{"query":{"type":"string"},"limit":{"type":"integer","default":10}},"required":["query"]}',
 'documents.search'),

-- Research tools
('web_search', 'Web Search', 'Search the web for information', 'research',
 '{"type":"object","properties":{"query":{"type":"string","description":"Search query"},"max_results":{"type":"integer","default":5}},"required":["query"]}',
 'research.web_search'),

-- Data tools
('query_data', 'Query Data', 'Run a structured data query', 'data',
 '{"type":"object","properties":{"table":{"type":"string","description":"Table or view name"},"filters":{"type":"object","description":"Key-value filter conditions"},"limit":{"type":"integer","default":50}},"required":["table"]}',
 'data.query')

ON CONFLICT (name) DO NOTHING;

-- ============================================
-- DONE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Tool definitions migration completed successfully';
  RAISE NOTICE 'Table created: tool_definitions';
  RAISE NOTICE 'Seed data: 15 tool definitions mapped to capabilities and actions';
END $$;
