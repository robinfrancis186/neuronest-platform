from django.db import migrations

def install(apps,schema_editor):
    if schema_editor.connection.vendor=='postgresql':
        schema_editor.execute('CREATE EXTENSION IF NOT EXISTS btree_gist')
        schema_editor.execute("ALTER TABLE api_slot ADD CONSTRAINT practitioner_slot_no_overlap EXCLUDE USING gist (practitioner_id WITH =, tstzrange(starts_at, ends_at, '[)') WITH &&)")
        schema_editor.execute("""CREATE FUNCTION prevent_signed_record_update() RETURNS trigger AS $$ BEGIN IF OLD.status = 'signed' THEN RAISE EXCEPTION 'Signed records are immutable' USING ERRCODE = '23514'; END IF; IF TG_OP = 'DELETE' THEN RETURN OLD; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql""")
        schema_editor.execute('CREATE TRIGGER immutable_signed_record BEFORE UPDATE OR DELETE ON api_record FOR EACH ROW EXECUTE FUNCTION prevent_signed_record_update()')
    elif schema_editor.connection.vendor=='sqlite':
        schema_editor.execute("CREATE TRIGGER immutable_signed_record_update BEFORE UPDATE ON api_record WHEN OLD.status = 'signed' BEGIN SELECT RAISE(ABORT, 'Signed records are immutable'); END")
        schema_editor.execute("CREATE TRIGGER immutable_signed_record_delete BEFORE DELETE ON api_record WHEN OLD.status = 'signed' BEGIN SELECT RAISE(ABORT, 'Signed records are immutable'); END")

def uninstall(apps,schema_editor):
    if schema_editor.connection.vendor=='postgresql':
        schema_editor.execute('DROP TRIGGER IF EXISTS immutable_signed_record ON api_record')
        schema_editor.execute('DROP FUNCTION IF EXISTS prevent_signed_record_update()')
        schema_editor.execute('ALTER TABLE api_slot DROP CONSTRAINT IF EXISTS practitioner_slot_no_overlap')
    elif schema_editor.connection.vendor=='sqlite':
        schema_editor.execute('DROP TRIGGER IF EXISTS immutable_signed_record_update'); schema_editor.execute('DROP TRIGGER IF EXISTS immutable_signed_record_delete')
class Migration(migrations.Migration):
    dependencies=[('api','0001_initial')]
    operations=[migrations.RunPython(install,uninstall)]
