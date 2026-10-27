"""Clearly labelled fictional doctors with 30-minute IST availability."""
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone
from api.models import Account, Practitioner, Slot


class Command(BaseCommand):
    help = "Create four fictional doctors with INR 100/150/200/300 test fees and two weeks of availability."

    def add_arguments(self, parser):
        parser.add_argument("--allow-production-test-profiles", action="store_true",
                            help="Explicitly publish labelled test profiles; does not enable live payments.")

    @transaction.atomic
    def handle(self, *args, **options):
        if settings.PRODUCTION and not options.get("allow_production_test_profiles"):
            raise CommandError("Demo fixtures require a test environment.")
        now = timezone.now()
        ist = ZoneInfo("Asia/Kolkata")
        from api.demo_booking import DOCTORS, REASON
        for rate, name, specialty in DOCTORS:
            email = f"review-doctor-{rate}@example.invalid"
            account, created = Account.objects.get_or_create(email=email, defaults={
                "username": email, "display_name": name, "role": "doctor"})
            if created:
                account.set_unusable_password()
                account.save(update_fields=["password"])
            if account.role != "doctor" or account.display_name != name or account.has_usable_password():
                raise CommandError("An existing account conflicts with this demo fixture.")
            practitioner, _ = Practitioner.objects.update_or_create(user=account, defaults={
                "profession": "doctor", "specialty": specialty,
                "languages": ["en", "ml"], "fee_minor": rate * 100, "verified": True, "status": "active",
                "registration_number": f"PROJECT-DEMO-{rate}", "verification_reason": REASON,
                "bio": "Fictional project-demo profile. Test bookings only; no medical consultation. Monday–Friday, 10:30 am–3 pm IST; lunch 12:30–1:30 pm. 30-minute slots.",
            })
            existing = set(Slot.objects.filter(practitioner=practitioner, starts_at__gte=now).values_list("starts_at", flat=True))
            slots = []
            for offset in range(14):
                day = now.astimezone(ist).date() + timedelta(days=offset)
                if day.weekday() >= 5:
                    continue
                for hour, minute in [(10,30), (11,0), (11,30), (12,0), (13,30), (14,0), (14,30)]:
                    starts = datetime.combine(day, time(hour, minute), tzinfo=ist)
                    if starts <= now or starts in existing:
                        continue
                    # Both consultation types use distinct times; a demo clinic is never a real address.
                    mode = "online" if (hour, minute) in [(10,30), (11,30), (13,30), (14,30)] else "in_person"
                    slots.append(Slot(practitioner=practitioner, starts_at=starts,
                        ends_at=starts + timedelta(minutes=30), consultation_mode=mode,
                        clinic_address="NeuroNest demo clinic — project simulation only" if mode == "in_person" else ""))
            Slot.objects.bulk_create(slots, ignore_conflicts=True)
            self.stdout.write(f"{name}: INR {rate} test checkout; {len(slots)} future slots prepared.")
