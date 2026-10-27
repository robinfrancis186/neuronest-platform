CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE api_slot ADD CONSTRAINT practitioner_slot_no_overlap
  EXCLUDE USING gist (practitioner_id WITH =, tstzrange(starts_at, ends_at, '[)') WITH &&);
CREATE OR REPLACE FUNCTION prevent_signed_record_update() RETURNS trigger AS $$
BEGIN
  IF OLD.status = 'signed' THEN
    RAISE EXCEPTION 'Signed records are immutable' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER immutable_signed_record
  BEFORE UPDATE OR DELETE ON api_record
  FOR EACH ROW EXECUTE FUNCTION prevent_signed_record_update();
