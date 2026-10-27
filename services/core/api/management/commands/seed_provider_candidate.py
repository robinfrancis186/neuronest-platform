"""Stage the product-owner-supplied Dr Keerthy S profile for operations review."""

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Q

from api.models import Account, ProviderApplication


DISPLAY_NAME = "Dr Keerthy S"
LANGUAGES = ["en"]
FEE_MINOR = 25_000


class Command(BaseCommand):
    help = (
        "Stage Dr Keerthy S on her verified NeuroNest account; it never publishes a practitioner."
    )

    def add_arguments(self, parser):
        parser.add_argument("--account-email", required=True)

    @transaction.atomic
    def handle(self, *args, **options):
        account = Account.objects.filter(
            Q(oidc_subject__isnull=False) | Q(firebase_subject__isnull=False),
            email__iexact=options["account_email"].strip(),
            is_active=True,
        ).first()
        if not account:
            raise CommandError(
                "Create and verify the provider's Firebase or legacy NeuroNest account before staging."
            )
        application, created = ProviderApplication.objects.get_or_create(
            user=account,
            defaults={
                "display_name": DISPLAY_NAME,
                "specialty": "Developmental pediatrics",
                "profession": "doctor",
                "languages": LANGUAGES,
                "fee_minor": FEE_MINOR,
                "registration_number": "",
                "bio": (
                    "Developmental Pediatrician at the National Institute of Physical Medicine "
                    "and Rehabilitation (2023–present). MD Pediatrics, DNB Pediatrics and "
                    "PGDDN from the Child Development Centre, Thiruvananthapuram."
                ),
                "review_reason": (
                    "Profile staged from information supplied by the product owner. Verify identity, "
                    "professional registration number and availability before approval."
                ),
            },
        )
        if not created and application.display_name != DISPLAY_NAME:
            raise CommandError("This account already has a different provider application.")
        if created:
            self.stdout.write(
                self.style.SUCCESS(f"Created pending provider candidate {application.pk}.")
            )
            return
        if application.status == "pending":
            updates = []
            if not application.languages:
                application.languages = LANGUAGES
                updates.append("languages")
            if application.fee_minor <= 0:
                application.fee_minor = FEE_MINOR
                updates.append("fee_minor")
            if updates:
                application.save(update_fields=updates)
                self.stdout.write("Updated missing supplied candidate details.")
                return
        self.stdout.write("Provider candidate already exists; no changes made.")
