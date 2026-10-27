from datetime import timedelta
from unittest import skipUnless
from django.db import connection, transaction, IntegrityError
from django.test import TestCase
from django.utils import timezone
from .models import Account, Practitioner, Slot


@skipUnless(connection.vendor == "postgresql", "PostgreSQL exclusion-constraint verification")
class PostgreSQLDatabaseGuards(TestCase):
    def test_direct_overlapping_slots_rejected_by_database(self):
        user = Account.objects.create_user(
            username="postgres-doctor", email="postgres@example.test", role="doctor"
        )
        practitioner = Practitioner.objects.create(
            user=user, profession="doctor", specialty="Synthetic", verified=True, status="active"
        )
        start = timezone.now() + timedelta(days=1)
        Slot.objects.create(
            practitioner=practitioner, starts_at=start, ends_at=start + timedelta(minutes=30)
        )
        with self.assertRaises(IntegrityError), transaction.atomic():
            Slot.objects.create(
                practitioner=practitioner,
                starts_at=start + timedelta(minutes=10),
                ends_at=start + timedelta(minutes=40),
            )
        adjacent = Slot.objects.create(
            practitioner=practitioner,
            starts_at=start + timedelta(minutes=30),
            ends_at=start + timedelta(minutes=60),
        )
        self.assertIsNotNone(adjacent.id)
