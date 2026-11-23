-- Éclat Balaton foglalási rendszer — alapséma
-- Minden pénzösszeg egész forintban (HUF) tárolódik.
-- Dátumtartományok: [érkezés, távozás) — a távozás napja már nem foglalt éjszaka.

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE properties (
  id                  serial PRIMARY KEY,
  slug                text NOT NULL UNIQUE,
  name                text NOT NULL,
  max_guests          int  NOT NULL CHECK (max_guests > 0),
  base_guests         int  NOT NULL CHECK (base_guests > 0),
  extra_guest_fee     int  NOT NULL DEFAULT 0 CHECK (extra_guest_fee >= 0),
  base_nightly_rate   int  NOT NULL CHECK (base_nightly_rate >= 0),
  default_min_nights  int  NOT NULL DEFAULT 1 CHECK (default_min_nights >= 1),
  -- az éjszaka kezdőnapjának ISO hét-napja (1=hétfő … 7=vasárnap); alapból péntek és szombat éjszaka
  weekend_nights      int[] NOT NULL DEFAULT '{5,6}',
  min_advance_days    int  NOT NULL DEFAULT 1 CHECK (min_advance_days >= 0),
  max_advance_days    int  NOT NULL DEFAULT 450 CHECK (max_advance_days > 0),
  booking_mode        text NOT NULL DEFAULT 'request' CHECK (booking_mode IN ('request', 'instant')),
  payment_mode        text NOT NULL DEFAULT 'deposit' CHECK (payment_mode IN ('deposit', 'full')),
  deposit_percent     int  NOT NULL DEFAULT 30 CHECK (deposit_percent BETWEEN 0 AND 100),
  balance_due_days    int  NOT NULL DEFAULT 14 CHECK (balance_due_days >= 0),
  -- [{ "daysBefore": 30, "refundPercent": 100 }, …] — csökkenő daysBefore szerint
  cancellation_rules  jsonb NOT NULL DEFAULT '[]',
  check_in_time       text NOT NULL DEFAULT '[PLACEHOLDER]',
  check_out_time      text NOT NULL DEFAULT '[PLACEHOLDER]',
  -- szerkeszthető szöveges tartalom (bemutatkozás, felszereltség, környék, vendéginformációk, jogi szövegek)
  content             jsonb NOT NULL DEFAULT '{}',
  ical_export_token   text NOT NULL,
  timezone            text NOT NULL DEFAULT 'Europe/Budapest',
  currency            text NOT NULL DEFAULT 'HUF',
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE seasons (
  id            serial PRIMARY KEY,
  property_id   int  NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name          text NOT NULL,
  start_date    date NOT NULL,
  end_date      date NOT NULL,            -- záró nap is beletartozik
  nightly_rate  int  NOT NULL CHECK (nightly_rate >= 0),
  weekend_rate  int  CHECK (weekend_rate >= 0),
  min_nights    int  CHECK (min_nights >= 1),
  priority      int  NOT NULL DEFAULT 0,
  CHECK (end_date >= start_date)
);
CREATE INDEX seasons_property_idx ON seasons (property_id, start_date, end_date);

-- egyedi napidíjak és ünnepnapi árak
CREATE TABLE rate_overrides (
  id            serial PRIMARY KEY,
  property_id   int  NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  date          date NOT NULL,
  nightly_rate  int  CHECK (nightly_rate >= 0),
  min_nights    int  CHECK (min_nights >= 1),
  label         text NOT NULL DEFAULT '',
  kind          text NOT NULL DEFAULT 'custom' CHECK (kind IN ('custom', 'holiday')),
  UNIQUE (property_id, date)
);

CREATE TABLE fees (
  id            serial PRIMARY KEY,
  property_id   int  NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name          text NOT NULL,
  kind          text NOT NULL CHECK (kind IN ('per_stay', 'per_night', 'per_guest_night')),
  amount        int  NOT NULL CHECK (amount >= 0),
  active        boolean NOT NULL DEFAULT true,
  sort          int  NOT NULL DEFAULT 0
);

CREATE TABLE coupons (
  id            serial PRIMARY KEY,
  property_id   int  NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  code          text NOT NULL,
  kind          text NOT NULL CHECK (kind IN ('percent', 'fixed')),
  value         int  NOT NULL CHECK (value > 0),
  valid_from    date,
  valid_to      date,
  min_nights    int  CHECK (min_nights >= 1),
  max_uses      int  CHECK (max_uses >= 1),
  used_count    int  NOT NULL DEFAULT 0,
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CHECK (kind <> 'percent' OR value <= 100)
);
CREATE UNIQUE INDEX coupons_code_idx ON coupons (property_id, upper(code));

CREATE TABLE bookings (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference          text NOT NULL UNIQUE,
  property_id        int  NOT NULL REFERENCES properties(id),
  check_in           date NOT NULL,
  check_out          date NOT NULL,
  stay               daterange GENERATED ALWAYS AS (daterange(check_in, check_out, '[)')) STORED,
  adults             int  NOT NULL CHECK (adults >= 1),
  children           int  NOT NULL DEFAULT 0 CHECK (children >= 0),
  -- hold = időkorlátos zárolás a foglalási űrlap kitöltése alatt
  status             text NOT NULL CHECK (status IN ('hold', 'pending', 'confirmed', 'paid', 'cancelled', 'expired')),
  source             text NOT NULL DEFAULT 'website' CHECK (source IN ('website', 'admin')),
  guest_name         text,
  guest_email        text,
  guest_phone        text,
  guest_country      text,
  guest_message      text,
  price              jsonb NOT NULL,          -- az árajánlat pillanatképe
  total              int  NOT NULL CHECK (total >= 0),
  deposit_due        int  NOT NULL CHECK (deposit_due >= 0),
  amount_paid        int  NOT NULL DEFAULT 0,
  coupon_id          int  REFERENCES coupons(id),
  hold_expires_at    timestamptz,
  hold_token_hash    text,
  access_token_hash  text,
  privacy_accepted_at timestamptz,
  ip_hash            text,
  admin_note         text,
  cancel_reason      text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  confirmed_at       timestamptz,
  cancelled_at       timestamptz,
  CHECK (check_out > check_in),
  -- Adatbázis-szintű védelem: két aktív foglalás nem fedheti át egymást ugyanazon a szálláson.
  CONSTRAINT bookings_no_overlap EXCLUDE USING gist (property_id WITH =, stay WITH &&)
    WHERE (status IN ('hold', 'pending', 'confirmed', 'paid'))
);
CREATE INDEX bookings_property_dates_idx ON bookings (property_id, check_in, check_out);
CREATE INDEX bookings_status_idx ON bookings (status);
CREATE INDEX bookings_hold_expiry_idx ON bookings (hold_expires_at) WHERE status = 'hold';

CREATE TABLE ical_feeds (
  id              serial PRIMARY KEY,
  property_id     int  NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name            text NOT NULL,
  url             text NOT NULL,
  active          boolean NOT NULL DEFAULT true,
  last_synced_at  timestamptz,
  last_status     text,
  last_error      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- zárolt időpontok (kézi zárolás vagy külső naptárból importált foglaltság)
CREATE TABLE blocks (
  id            serial PRIMARY KEY,
  property_id   int  NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  check_in      date NOT NULL,
  check_out     date NOT NULL,
  stay          daterange GENERATED ALWAYS AS (daterange(check_in, check_out, '[)')) STORED,
  reason        text NOT NULL DEFAULT '',
  source        text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'ical')),
  feed_id       int  REFERENCES ical_feeds(id) ON DELETE CASCADE,
  external_uid  text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CHECK (check_out > check_in)
);
CREATE INDEX blocks_stay_idx ON blocks USING gist (property_id, stay);
CREATE UNIQUE INDEX blocks_feed_uid_idx ON blocks (feed_id, external_uid) WHERE feed_id IS NOT NULL;

CREATE TABLE payments (
  id            serial PRIMARY KEY,
  booking_id    uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  provider      text NOT NULL,               -- manual | stripe | barion | simplepay
  kind          text NOT NULL CHECK (kind IN ('deposit', 'balance', 'full', 'refund')),
  amount        int  NOT NULL,
  status        text NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  provider_ref  text,
  note          text,
  verified_at   timestamptz,
  recorded_by   text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX payments_provider_ref_idx ON payments (provider, provider_ref) WHERE provider_ref IS NOT NULL;

CREATE TABLE admin_users (
  id             serial PRIMARY KEY,
  email          text NOT NULL UNIQUE,
  name           text NOT NULL,
  password_hash  text NOT NULL,
  -- owner: minden; manager: foglalások és árak, vendégadatok maszkolva
  role           text NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'manager')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  last_login_at  timestamptz
);

CREATE TABLE admin_sessions (
  id          serial PRIMARY KEY,
  token_hash  text NOT NULL UNIQUE,
  user_id     int  NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE login_attempts (
  id     bigserial PRIMARY KEY,
  key    text NOT NULL,
  at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX login_attempts_key_idx ON login_attempts (key, at);

CREATE TABLE rate_limits (
  id     bigserial PRIMARY KEY,
  key    text NOT NULL,
  at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX rate_limits_key_idx ON rate_limits (key, at);

CREATE TABLE audit_log (
  id           bigserial PRIMARY KEY,
  actor        text NOT NULL,
  action       text NOT NULL,
  entity_type  text NOT NULL,
  entity_id    text,
  details      jsonb NOT NULL DEFAULT '{}',
  at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_log_entity_idx ON audit_log (entity_type, entity_id);

CREATE TABLE email_outbox (
  id          bigserial PRIMARY KEY,
  to_addr     text NOT NULL,
  subject     text NOT NULL,
  body_text   text NOT NULL,
  template    text NOT NULL,
  booking_id  uuid REFERENCES bookings(id) ON DELETE SET NULL,
  status      text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed', 'logged')),
  attempts    int  NOT NULL DEFAULT 0,
  error       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  sent_at     timestamptz
);

CREATE TABLE media (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id  int  NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  mime         text NOT NULL,
  width        int  NOT NULL,
  height       int  NOT NULL,
  data         bytea NOT NULL,      -- max. 2000 px széles WebP
  thumb        bytea NOT NULL,      -- 800 px széles WebP
  alt          text NOT NULL DEFAULT '',
  caption      text NOT NULL DEFAULT '',
  sort         int  NOT NULL DEFAULT 0,
  is_cover     boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX media_property_idx ON media (property_id, sort);
