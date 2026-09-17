-- The application accesses PostgreSQL through a private server-side role.
-- Enabling RLS without public policies closes Supabase's Data API for all
-- application tables while the dedicated BYPASSRLS role remains usable by
-- the Next.js backend.
DO $$
DECLARE
  target_table record;
BEGIN
  FOR target_table IN
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY',
      target_table.schemaname,
      target_table.tablename
    );
  END LOOP;
END $$;
