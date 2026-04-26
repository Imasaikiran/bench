-- scans: one row per scan, anonymous unless linked to a profile
CREATE TABLE scans (
  id            TEXT PRIMARY KEY,       -- nanoid, 10 chars
  payload       JSONB NOT NULL,         -- full upload JSON
  payload_hash  TEXT NOT NULL,          -- sha256 of payload, for duplicate detection
  ip_hash       TEXT,                   -- sha256(ip + daily_salt), rate-limit only, not identifying
  user_agent    TEXT,                   -- CLI version from UA header
  rubric_version TEXT NOT NULL,
  is_suspect    BOOLEAN NOT NULL DEFAULT FALSE,  -- anomaly-detection flag, excluded from /stats
  suspect_reason TEXT,                           -- which rule flagged, for audit
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ             -- NULL if claimed, NOW+30d otherwise
);
CREATE INDEX idx_scans_expires ON scans(expires_at) WHERE expires_at IS NOT NULL;

-- profiles: claimed handles
CREATE TABLE profiles (
  handle        TEXT PRIMARY KEY,       -- lowercase github login
  github_id     BIGINT NOT NULL UNIQUE,
  latest_scan   TEXT REFERENCES scans(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_profiles_latest ON profiles(latest_scan);

-- feedback: "this number is wrong" submissions
CREATE TABLE feedback (
  id          BIGSERIAL PRIMARY KEY,
  scan_id     TEXT REFERENCES scans(id) ON DELETE CASCADE,
  dimension   TEXT,                      -- "hours", "tier", "dim:14", ...
  reason      TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- rate limit table (also backed by Cloudflare WAF in front)
CREATE TABLE rate_limits (
  ip_hash     TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL,
  PRIMARY KEY (ip_hash, window_start)
);
