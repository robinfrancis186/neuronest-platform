CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

ALTER TABLE public.api_outbox ADD COLUMN dedupe_key varchar(180) NULL;
ALTER TABLE public.api_outbox
  ADD CONSTRAINT api_outbox_dedupe_key_uniq UNIQUE (dedupe_key);

CREATE TABLE public.api_schedulerheartbeat (
  name varchar(40) NOT NULL PRIMARY KEY,
  lease_until timestamp with time zone NULL,
  last_started_at timestamp with time zone NULL,
  last_success_at timestamp with time zone NULL,
  last_error varchar(100) NOT NULL
);
ALTER TABLE public.api_schedulerheartbeat ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.api_schedulerheartbeat FROM anon, authenticated;
CREATE POLICY neuronest_no_direct_api ON public.api_schedulerheartbeat
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE SCHEMA IF NOT EXISTS neuronest_internal;
REVOKE ALL ON SCHEMA neuronest_internal FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION neuronest_internal.dispatch_scheduler_job(job text)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, vault, net, neuronest_internal, pg_temp
AS $$
DECLARE
  endpoint text;
  token text;
BEGIN
  IF job NOT IN ('outbox', 'reminders') THEN
    RAISE EXCEPTION 'Unsupported scheduler job';
  END IF;
  SELECT decrypted_secret INTO endpoint
  FROM vault.decrypted_secrets
  WHERE name = 'neuronest_core_scheduler_url'
  LIMIT 1;
  SELECT decrypted_secret INTO token
  FROM vault.decrypted_secrets
  WHERE name = 'neuronest_outbox_dispatch_token'
  LIMIT 1;
  IF endpoint IS NULL OR token IS NULL THEN
    RAISE EXCEPTION 'Scheduler Vault secrets are not configured';
  END IF;
  RETURN net.http_post(
    url := endpoint,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-NeuroNest-Scheduler', token
    ),
    body := jsonb_build_object('job', job),
    timeout_milliseconds := 45000
  );
END;
$$;
REVOKE ALL ON FUNCTION neuronest_internal.dispatch_scheduler_job(text)
  FROM PUBLIC, anon, authenticated;

INSERT INTO public.django_migrations (app, name, applied)
VALUES ('api', '0007_scheduler_delivery', now());
