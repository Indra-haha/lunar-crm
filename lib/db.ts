import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@127.0.0.1:5432/lunar_crm';

declare global {
  // eslint-disable-next-line no-var
  var _postgresClient: postgres.Sql | undefined;
  // eslint-disable-next-line no-var
  var _isDbInitialized: boolean | undefined;
}

const client =
  global._postgresClient ||
  postgres(DATABASE_URL, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    onnotice: () => {}, // suppress notice spam
  });

if (process.env.NODE_ENV !== 'production') {
  global._postgresClient = client;
}

export const sql = client;
export const db = drizzle(client, { schema });

const INIT_SQL = `
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'STUDIO_ADMIN',
  avatar_url TEXT DEFAULT '',
  last_login_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id VARCHAR(50) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  social_handle VARCHAR(100) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  acquisition_channel VARCHAR(50) NOT NULL DEFAULT 'WHATSAPP',
  segment VARCHAR(50) NOT NULL DEFAULT 'REGULAR',
  accepts_marketing BOOLEAN NOT NULL DEFAULT true,
  avatar_url TEXT DEFAULT '',
  city VARCHAR(100) DEFAULT 'Jakarta',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_name VARCHAR(255) NOT NULL,
  social_handle VARCHAR(100) NOT NULL,
  phone VARCHAR(50) DEFAULT '',
  inbound_channel VARCHAR(50) NOT NULL DEFAULT 'WHATSAPP',
  message_preview TEXT NOT NULL,
  inbound_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  first_response_at TIMESTAMPTZ,
  status VARCHAR(50) NOT NULL DEFAULT 'NEW',
  converted_customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_code VARCHAR(50) UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_name VARCHAR(255) NOT NULL,
  variant_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  total_price INTEGER NOT NULL DEFAULT 0,
  batch_name VARCHAR(255) NOT NULL DEFAULT 'Batch #12 Keychain & Artprint',
  brief_notes TEXT DEFAULT '',
  design_url TEXT DEFAULT '',
  pipeline_status VARCHAR(50) NOT NULL DEFAULT 'ORDER_MASUK',
  stuck_alert BOOLEAN NOT NULL DEFAULT false,
  entered_stage_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  payment_status VARCHAR(50) NOT NULL DEFAULT 'LUNAS',
  vendor_name VARCHAR(255) DEFAULT 'Vendor Akrilik Jaya',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'AKRILIK',
  base_price INTEGER NOT NULL DEFAULT 0,
  vendor_name VARCHAR(255) NOT NULL DEFAULT 'Maklon Akrilik Subur',
  variants JSONB NOT NULL DEFAULT '[]',
  batch_available VARCHAR(100) DEFAULT 'Batch #12 Open',
  is_active BOOLEAN NOT NULL DEFAULT true,
  image_url TEXT DEFAULT '',
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS qa_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID UNIQUE NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  spec_matched BOOLEAN NOT NULL DEFAULT false,
  quantity_matched BOOLEAN NOT NULL DEFAULT false,
  no_defects BOOLEAN NOT NULL DEFAULT false,
  peel_off_film_checked BOOLEAN NOT NULL DEFAULT true,
  photo_proof_url TEXT DEFAULT '',
  inspector_name VARCHAR(100) NOT NULL DEFAULT 'Said Najih',
  notes TEXT DEFAULT '',
  checked_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_code VARCHAR(50) UNIQUE NOT NULL,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL DEFAULT 'CATEGORY_A',
  issue_detail TEXT NOT NULL,
  assigned_pic VARCHAR(100) NOT NULL DEFAULT 'Said Najih',
  status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL DEFAULT 5,
  comment TEXT NOT NULL,
  is_pinned_for_social BOOLEAN NOT NULL DEFAULT false,
  customer_name VARCHAR(255) DEFAULT '',
  social_handle VARCHAR(100) DEFAULT '',
  city VARCHAR(100) DEFAULT 'Jakarta',
  avatar_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  trigger_key VARCHAR(100) UNIQUE NOT NULL,
  category VARCHAR(50) DEFAULT 'katalog',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS message_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_name VARCHAR(255) NOT NULL,
  recipient_phone VARCHAR(50) NOT NULL,
  template_key VARCHAR(100) NOT NULL,
  template_title VARCHAR(255) NOT NULL,
  message_content TEXT NOT NULL,
  channel VARCHAR(50) NOT NULL DEFAULT 'WHATSAPP',
  status VARCHAR(50) NOT NULL DEFAULT 'SENT',
  dispatched_by VARCHAR(100) NOT NULL DEFAULT 'Admin Studio',
  reference_type VARCHAR(50),
  reference_id VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customers_segment ON customers(segment);
CREATE INDEX IF NOT EXISTS idx_customers_channel ON customers(acquisition_channel);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(pipeline_status);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_inbound ON leads(inbound_at);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_order ON support_tickets(order_id);
CREATE INDEX IF NOT EXISTS idx_customer_feedbacks_order ON customer_feedbacks(order_id);
CREATE INDEX IF NOT EXISTS idx_message_logs_created ON message_logs(created_at);
`;

export async function connectToDatabase() {
  if (!global._isDbInitialized) {
    try {
      await client.unsafe(INIT_SQL);
      global._isDbInitialized = true;
    } catch (err) {
      console.error('Error auto-initializing PostgreSQL database tables:', err);
    }
  }
  return db;
}

export default connectToDatabase;
