from django.core.management import CommandError, call_command
from django.test import TestCase
from rest_framework.test import APIClient

from .models import Account, Practitioner, ProviderApplication, Slot
from .management.commands.seed_provider_candidate import DISPLAY_NAME, FEE_MINOR, LANGUAGES


class ProviderCandidateSeedTests(TestCase):
    def test_candidate_stays_pending_and_cannot_be_approved_incompletely(self):
        account = Account.objects.create_user(
            username="dr.keerthy.s",
            email="dr.keerthy@example.test",
            display_name="Keerthy",
            role="parent",
            oidc_subject="provider-subject",
        )
        call_command("seed_provider_candidate", account_email=account.email)
        call_command("seed_provider_candidate", account_email=account.email)

        application = ProviderApplication.objects.get(user=account)
        self.assertEqual(application.display_name, DISPLAY_NAME)
        self.assertEqual(application.status, "pending")
        self.assertEqual(application.registration_number, "")
        self.assertEqual(application.languages, LANGUAGES)
        self.assertEqual(application.fee_minor, FEE_MINOR)
        self.assertFalse(Practitioner.objects.filter(user=account).exists())
        self.assertFalse(Slot.objects.filter(practitioner__user=account).exists())

        admin = Account.objects.create_user(
            username="provider-review-admin",
            email="provider-review-admin@example.test",
            role="admin",
        )
        client = APIClient()
        client.force_authenticate(admin)
        response = client.post(
            f"/v1/provider-applications/{application.pk}/review/",
            {"status": "approved", "reason": "Credentials checked"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("professional registration number", str(response.json()))
        self.assertFalse(Practitioner.objects.filter(user=account).exists())

    def test_candidate_requires_a_verified_provider_account(self):
        with self.assertRaises(CommandError):
            call_command("seed_provider_candidate", account_email="missing@example.test")

    def test_candidate_accepts_a_verified_firebase_account(self):
        account = Account.objects.create_user(
            username="pending:firebase-provider",
            username_claimed=False,
            email="dr.keerthy.firebase@example.test",
            display_name="Keerthy",
            role="parent",
            firebase_subject="firebase-provider-subject",
        )

        call_command("seed_provider_candidate", account_email=account.email)

        application = ProviderApplication.objects.get(user=account)
        self.assertEqual(application.status, "pending")
        self.assertFalse(Practitioner.objects.filter(user=account).exists())

    def test_seed_fills_only_missing_supplied_details(self):
        account = Account.objects.create_user(
            username="dr.keerthy.old",
            email="dr.keerthy.old@example.test",
            display_name="Keerthy",
            role="parent",
            firebase_subject="firebase-old-provider-subject",
        )
        application = ProviderApplication.objects.create(
            user=account,
            display_name=DISPLAY_NAME,
            specialty="Developmental pediatrics",
            profession="doctor",
            languages=[],
            fee_minor=0,
            registration_number="",
            status="pending",
        )

        call_command("seed_provider_candidate", account_email=account.email)

        application.refresh_from_db()
        self.assertEqual(application.languages, LANGUAGES)
        self.assertEqual(application.fee_minor, FEE_MINOR)
        self.assertEqual(application.registration_number, "")
