# Database Schema Update for Nanoid IDs

## Update Stores Table

You need to modify your `stores` table in Supabase to use string IDs instead of auto-increment integers.

### SQL Commands:

```sql
-- 1. Create a new stores table with string ID
CREATE TABLE stores_new (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  address TEXT NOT NULL,
  email TEXT,
  website TEXT,
  notes TEXT,
  has_stocked_before BOOLEAN DEFAULT FALSE,
  submitted_by UUID REFERENCES auth.users(id),
  permalink TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. If you have existing data, migrate it (optional)
-- INSERT INTO stores_new (id, name, city, country, address, email, website, notes, has_stocked_before, submitted_by, created_at)
-- SELECT 
--   'legacy-' || id::text as id,
--   name, city, country, address, email, website, notes, has_stocked_before, submitted_by, created_at
-- FROM stores;

-- 3. Drop the old table and rename the new one
-- DROP TABLE stores;
-- ALTER TABLE stores_new RENAME TO stores;

-- 4. Add the permalink column if it doesn't exist
ALTER TABLE stores ADD COLUMN IF NOT EXISTS permalink TEXT;

-- 5. Add latitude and longitude columns for map coordinates
ALTER TABLE stores ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE stores ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
```

### Alternative: Modify Existing Table

If you prefer to modify the existing table:

```sql
-- 1. Add permalink column
ALTER TABLE stores ADD COLUMN IF NOT EXISTS permalink TEXT;

-- 2. Change ID column type (this will require recreating the table)
-- Note: This will lose existing data unless you backup first
ALTER TABLE stores ALTER COLUMN id TYPE TEXT;
```

## Fix Store Tags Table

The `store_tags` table needs to be updated to accept string IDs for `tag_id` instead of UUIDs, since the `tags` table uses nanoid IDs.

### SQL Commands:

```sql
-- 1. Drop the existing store_tags table (if it exists)
DROP TABLE IF EXISTS store_tags;

-- 2. Create a new store_tags table with string IDs
CREATE TABLE store_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id TEXT REFERENCES stores(id) ON DELETE CASCADE,
  tag_id TEXT REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(store_id, tag_id)
);

-- 3. Add indexes for better performance
CREATE INDEX idx_store_tags_store_id ON store_tags(store_id);
CREATE INDEX idx_store_tags_tag_id ON store_tags(tag_id);
```

## Benefits of Nanoid IDs

- ✅ **Short & URL-friendly**: 6-character IDs like `a1b2c3`
- ✅ **Unique**: Extremely low collision probability
- ✅ **Secure**: Random and unpredictable
- ✅ **Fast**: Generated client-side
- ✅ **SEO-friendly**: Can be used in URLs

## Example IDs

Generated IDs will look like:
- `a1b2c3`
- `x9y8z7`
- `m5n4p3`

## Store URLs

Stores will now have URLs like:
- `/store/a1b2c3` (using ID)
- `/store/quimbys-bookstore-chicago` (using permalink) 