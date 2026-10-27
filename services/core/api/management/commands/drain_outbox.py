from django.core.management.base import BaseCommand
from django.db.models import F
from django.utils import timezone
from api.models import Outbox
from api.tasks import process_outbox


class Command(BaseCommand):
    help = "Process currently due outbox events synchronously, useful for development and operational recovery."

    def handle(self, *args, **options):
        ids = list(
            Outbox.objects.filter(status="pending", available_at__lte=timezone.now()).values_list(
                "id", flat=True
            )[:100]
        )
        for identifier in ids:
            Outbox.objects.filter(pk=identifier).update(attempts=F("attempts") + 1)
            process_outbox(str(identifier))
        self.stdout.write(f"Processed {len(ids)} outbox events.")
