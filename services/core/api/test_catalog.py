from django.core.management import call_command
from django.test import TestCase

from .management.commands.seed_learning_catalog import catalog_videos
from .models import Content


class LearningCatalogSeedTests(TestCase):
    def test_submitted_video_stays_pending_and_seed_is_idempotent(self):
        call_command("seed_learning_catalog")
        call_command("seed_learning_catalog")

        video = Content.objects.get(source_url="https://www.youtube.com/watch?v=MlhgsM1Sbck")
        self.assertEqual(video.review_status, "pending")
        self.assertEqual(Content.objects.filter(kind="video").count(), len(catalog_videos()))
        self.assertFalse(Content.objects.exclude(review_status="pending").exists())

    def test_search_links_and_collections_are_not_seeded_as_videos(self):
        call_command("seed_learning_catalog")
        self.assertEqual(Content.objects.count(), len(catalog_videos()))
        self.assertFalse(Content.objects.filter(source_url__contains="/results?").exists())
