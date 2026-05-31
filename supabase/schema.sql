-- Run this in the Supabase SQL Editor (Dashboard → SQL → New query)

CREATE TABLE IF NOT EXISTS inventory_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  serial_no INTEGER,
  series TEXT NOT NULL,
  search_key TEXT NOT NULL UNIQUE,
  opening INTEGER NOT NULL DEFAULT 0,
  added INTEGER NOT NULL DEFAULT 0,
  outward INTEGER NOT NULL DEFAULT 0,
  closing INTEGER NOT NULL,
  rack_no TEXT,
  spec TEXT,
  tag TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_item_series ON inventory_item (series);
CREATE INDEX IF NOT EXISTS idx_inventory_item_tag ON inventory_item (tag);
CREATE INDEX IF NOT EXISTS idx_inventory_item_spec ON inventory_item (spec);
CREATE INDEX IF NOT EXISTS idx_inventory_item_search_key ON inventory_item (search_key);

CREATE OR REPLACE FUNCTION set_inventory_item_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS inventory_item_updated_at ON inventory_item;
CREATE TRIGGER inventory_item_updated_at
  BEFORE UPDATE ON inventory_item
  FOR EACH ROW
  EXECUTE FUNCTION set_inventory_item_updated_at();

ALTER TABLE inventory_item ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read inventory_item"
  ON inventory_item FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert inventory_item"
  ON inventory_item FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update inventory_item"
  ON inventory_item FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete inventory_item"
  ON inventory_item FOR DELETE
  USING (true);
