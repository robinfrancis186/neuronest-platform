"""Seed submitted learning references without publishing or approving them."""

import json
import re
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from django.core.management.base import BaseCommand, CommandError

from api.models import Content


CATALOG_PATH = (
    Path(__file__).resolve().parents[5] / "packages" / "contracts" / "learning-catalog.json"
)
YOUTUBE_ID = re.compile(r"^[A-Za-z0-9_-]{11}$")


def catalog_videos():
    try:
        return [
            resource
            for resource in json.loads(CATALOG_PATH.read_text(encoding="utf-8"))["resources"]
            if resource["kind"] == "video"
        ]
    except (OSError, ValueError, KeyError) as error:
        raise CommandError(f"Cannot read learning catalog: {error}") from error


def valid_video(video):
    source_url = video.get("sourceUrl", "")
    parsed = urlparse(source_url)
    if (
        not YOUTUBE_ID.fullmatch(video.get("youtubeId", ""))
        or parsed.scheme != "https"
        or parsed.hostname not in {"youtube.com", "www.youtube.com"}
        or parse_qs(parsed.query).get("v") != [video["youtubeId"]]
    ):
        raise CommandError(f"Invalid YouTube entry: {video.get('catalogId', '<unknown>')}")
    if video.get("review", {}).get("published"):
        raise CommandError(
            "Catalog seeds cannot publish content; use the editorial review workflow."
        )


class Command(BaseCommand):
    help = "Seed submitted learning references as pending editorial and clinical review."

    def handle(self, *args, **options):
        created = updated = 0
        for video in catalog_videos():
            valid_video(video)
            defaults = {
                "title": video["title"],
                "summary": video["summary"],
                "language": "en",
                "kind": "video",
                "url": video["sourceUrl"],
                "available": video["availability"] != "unavailable",
            }
            content, was_created = Content.objects.get_or_create(
                source_url=video["sourceUrl"], defaults=defaults
            )
            if was_created:
                created += 1
            elif content.review_status == "pending":
                changed = [key for key, value in defaults.items() if getattr(content, key) != value]
                if changed:
                    for key in changed:
                        setattr(content, key, defaults[key])
                    content.save(update_fields=changed)
                    updated += 1
        self.stdout.write(
            f"Learning catalog: {created} created, {updated} pending entries updated."
        )
