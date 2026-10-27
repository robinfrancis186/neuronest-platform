from django.db import migrations

def update_trigger(apps,schema_editor):
    if schema_editor.connection.vendor=='postgresql':
        schema_editor.execute("""CREATE OR REPLACE FUNCTION prevent_signed_record_update() RETURNS trigger AS $$ BEGIN IF OLD.status = 'signed' THEN RAISE EXCEPTION 'Signed records are immutable' USING ERRCODE = '23514'; END IF; IF TG_OP = 'DELETE' THEN RETURN OLD; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql""")
class Migration(migrations.Migration):
    dependencies=[('api','0003_alter_growth_weight_kg')]
    operations=[migrations.RunPython(update_trigger,migrations.RunPython.noop)]
