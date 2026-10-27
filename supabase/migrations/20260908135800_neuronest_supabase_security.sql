DO $$
DECLARE row record;
BEGIN
  FOR row IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS neuronest_no_direct_api ON public.%I', row.tablename);
    EXECUTE format(
      'CREATE POLICY neuronest_no_direct_api ON public.%I FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)',
      row.tablename
    );
  END LOOP;
END;
$$;
ALTER FUNCTION public.prevent_signed_record_update() SET search_path = public, pg_temp;
ALTER EXTENSION btree_gist SET SCHEMA extensions;
REVOKE ALL ON FUNCTION public.prevent_signed_record_update() FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
