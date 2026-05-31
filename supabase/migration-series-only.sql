-- Run in Supabase SQL Editor after deploying the series-only app update.
-- Migrates existing rows so series/search_key hold the full lookup id (e.g. 2257FW).

-- If the old `code` column still exists, fold code + series into one value first.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'inventory_item'
      AND column_name = 'code'
  ) THEN
    UPDATE inventory_item
    SET
      series = upper(replace(trim(
        CASE
          WHEN trim(coalesce(code, '')) = '' THEN coalesce(series, '')
          WHEN trim(coalesce(series, '')) = '' THEN code
          ELSE code || series
        END
      ), ' ', '')),
      search_key = upper(replace(trim(
        CASE
          WHEN trim(coalesce(code, '')) = '' THEN coalesce(search_key, series, '')
          WHEN trim(coalesce(series, '')) = '' THEN code
          ELSE code || series
        END
      ), ' ', ''));

    ALTER TABLE inventory_item DROP COLUMN code;
  END IF;
END $$;

-- Ensure search_key always matches normalized series.
UPDATE inventory_item
SET search_key = upper(replace(trim(series), ' ', ''))
WHERE search_key IS DISTINCT FROM upper(replace(trim(series), ' ', ''));

DROP INDEX IF EXISTS idx_inventory_item_code;
