-- Create contact_lists table to group contact uploads
CREATE TABLE IF NOT EXISTS contact_lists (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  total_count INTEGER DEFAULT 0,
  valid_count INTEGER DEFAULT 0,
  invalid_count INTEGER DEFAULT 0,
  duplicate_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT now()
);

-- Create contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id SERIAL PRIMARY KEY,
  list_id INTEGER REFERENCES contact_lists(id) ON DELETE CASCADE,
  campaign_id INTEGER NULL,
  phone_number TEXT NOT NULL,
  name TEXT NULL,
  company TEXT NULL,
  custom1 TEXT NULL,
  custom2 TEXT NULL,
  status TEXT DEFAULT 'queued', -- queued | sent | delivered | failed | skipped
  sent_at TIMESTAMP DEFAULT NULL,
  failure_reason TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT now()
);

-- Create templates table for message templates
CREATE TABLE IF NOT EXISTS templates (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Create campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  template_id INTEGER REFERENCES templates(id),
  list_id INTEGER REFERENCES contact_lists(id),
  status TEXT DEFAULT 'draft', -- draft|scheduled|running|paused|completed|failed
  scheduled_at TIMESTAMP NULL,
  last_sent_index INTEGER DEFAULT 0,
  min_delay_seconds INTEGER DEFAULT 3,
  max_delay_seconds INTEGER DEFAULT 8,
  daily_limit INTEGER DEFAULT 200,
  consecutive_fail_threshold INTEGER DEFAULT 20, -- percentage (e.g. 20%)
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Create campaign_logs table for campaign system logs
CREATE TABLE IF NOT EXISTS campaign_logs (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
  event_type TEXT, -- info|error|warning|success
  message TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- Create messages table for two-way chat history
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  phone_number TEXT NOT NULL,
  direction TEXT NOT NULL, -- 'incoming' or 'outgoing'
  message_text TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false, -- only relevant for direction='incoming'
  timestamp TIMESTAMP DEFAULT now()
);

-- Index on phone_number for faster message history lookups
CREATE INDEX IF NOT EXISTS idx_messages_phone ON messages(phone_number);

-- Alter templates table to support media attachments
ALTER TABLE templates ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'none';
