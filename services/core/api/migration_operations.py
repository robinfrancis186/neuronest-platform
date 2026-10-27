"""Index creation that does not lock out writes on PostgreSQL.

A plain CREATE INDEX takes a lock that blocks writes to the table for the whole
build. That is harmless on an empty table and not harmless on a populated one,
so these operations use CONCURRENTLY where the backend supports it and fall back
to the ordinary path everywhere else (local SQLite development).

Concurrent builds cannot run inside a transaction, so a migration using these
must set `atomic = False`. The cost of that is real: if a concurrent build fails
partway, PostgreSQL leaves an INVALID index behind that has to be dropped before
retrying, and earlier operations in the migration stay applied.
"""

from django.contrib.postgres.operations import AddIndexConcurrently, RemoveIndexConcurrently
from django.db.migrations.operations import AddIndex, RemoveIndex


def _concurrent(schema_editor):
    return schema_editor.connection.vendor == "postgresql"


class AddIndexOnline(AddIndexConcurrently):
    def database_forwards(self, app_label, schema_editor, from_state, to_state):
        if _concurrent(schema_editor):
            super().database_forwards(app_label, schema_editor, from_state, to_state)
        else:
            AddIndex.database_forwards(self, app_label, schema_editor, from_state, to_state)

    def database_backwards(self, app_label, schema_editor, from_state, to_state):
        if _concurrent(schema_editor):
            super().database_backwards(app_label, schema_editor, from_state, to_state)
        else:
            AddIndex.database_backwards(self, app_label, schema_editor, from_state, to_state)


class RemoveIndexOnline(RemoveIndexConcurrently):
    def database_forwards(self, app_label, schema_editor, from_state, to_state):
        if _concurrent(schema_editor):
            super().database_forwards(app_label, schema_editor, from_state, to_state)
        else:
            RemoveIndex.database_forwards(self, app_label, schema_editor, from_state, to_state)

    def database_backwards(self, app_label, schema_editor, from_state, to_state):
        if _concurrent(schema_editor):
            super().database_backwards(app_label, schema_editor, from_state, to_state)
        else:
            RemoveIndex.database_backwards(self, app_label, schema_editor, from_state, to_state)
