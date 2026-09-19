-- 015_communication.sql
-- Conversations, messages, notifications
BEGIN;

-- Conversations
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID,
  title TEXT,
  conversation_type TEXT DEFAULT 'direct' NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active' NOT NULL,
  CONSTRAINT conversations_status_check CHECK (status IN ('active','archived')),
  CONSTRAINT conversations_type_check CHECK (conversation_type IN ('direct','group','announcement','support'))
);

-- Conversation members
CREATE TABLE IF NOT EXISTS conversation_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at TIMESTAMPTZ,
  CONSTRAINT conversation_members_conversation_id_user_id_key UNIQUE (conversation_id, user_id)
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_user_id UUID,
  organization_id UUID,
  message_type TEXT DEFAULT 'text' NOT NULL,
  body TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT messages_type_check CHECK (message_type IN ('text','image','file','system'))
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  channel TEXT DEFAULT 'in_app' NOT NULL,
  delivery_state TEXT DEFAULT 'pending' NOT NULL,
  retry_count INTEGER DEFAULT 0 NOT NULL,
  related_entity_type TEXT,
  related_entity_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  CONSTRAINT notifications_channel_check CHECK (channel IN ('in_app','email','sms','push')),
  CONSTRAINT notifications_delivery_check CHECK (delivery_state IN ('pending','sent','delivered','failed'))
);

COMMIT;
