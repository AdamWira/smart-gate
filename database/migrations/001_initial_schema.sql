-- Smart Gate PostgreSQL schema

CREATE TABLE IF NOT EXISTS admins (
  id BIGSERIAL PRIMARY KEY,
  username VARCHAR(80) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(10) NOT NULL DEFAULT 'operator' CHECK (role IN ('admin', 'operator')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(254) UNIQUE,
  phone VARCHAR(30),
  status VARCHAR(10) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rfid_cards (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  uid VARCHAR(64) NOT NULL UNIQUE,
  status VARCHAR(10) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'lost')),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cards_user_status ON rfid_cards(user_id, status);

CREATE TABLE IF NOT EXISTS access_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  card_id BIGINT REFERENCES rfid_cards(id) ON DELETE SET NULL,
  admin_id BIGINT REFERENCES admins(id) ON DELETE SET NULL,
  uid_snapshot VARCHAR(64) NOT NULL,
  user_name_snapshot VARCHAR(150),
  direction VARCHAR(5) NOT NULL CHECK (direction IN ('entry', 'exit')),
  result VARCHAR(7) NOT NULL CHECK (result IN ('granted', 'denied')),
  reason VARCHAR(100),
  source VARCHAR(12) NOT NULL DEFAULT 'simulation' CHECK (source IN ('simulation', 'manual')),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logs_occurred ON access_logs(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_user_occurred ON access_logs(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_result_occurred ON access_logs(result, occurred_at DESC);

CREATE TABLE IF NOT EXISTS gate_status (
  id SMALLINT NOT NULL PRIMARY KEY CHECK (id = 1),
  status VARCHAR(6) NOT NULL DEFAULT 'closed' CHECK (status IN ('open', 'closed')),
  changed_by BIGINT REFERENCES admins(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO gate_status (id, status) VALUES (1, 'closed') ON CONFLICT DO NOTHING;
