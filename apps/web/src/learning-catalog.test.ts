import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { youtubeThumbnail } from "./youtube-thumbnail.ts";

const catalog = JSON.parse(
  readFileSync(
    new URL("../../../packages/contracts/learning-catalog.json", import.meta.url),
    "utf8",
  ),
);

test("parent learning keeps ten topics with direct videos and the CDC collection", () => {
  assert.equal(catalog.version, 3);
  assert.deepEqual(
    catalog.resources.map((r) => r.catalogId),
    [
      "early-brain-development",
      "autism",
      "adhd",
      "epilepsy",
      "cerebral-palsy",
      "developmental-delay",
      "down-syndrome",
      "speech-language",
      "learning-differences",
      "milestones",
    ],
  );
  assert.equal(new Set(catalog.resources.map((r) => r.sourceUrl)).size, 10);
  assert.equal(catalog.resources.filter((r) => r.kind === "video").length, 9);
  for (const resource of catalog.resources) {
    const url = new URL(resource.sourceUrl);
    assert.equal(url.protocol, "https:");
    assert.equal(resource.audience, "Parents and caregivers");
    assert.ok(resource.summary && resource.sourceLabel);
    assert.equal(resource.review.published, false);
    assert.equal(resource.review.reviewer, null);
    assert.equal(resource.review.status, "awaiting_editorial_clinical_review");
    if (resource.kind === "video") {
      assert.equal(url.hostname, "www.youtube.com");
      assert.equal(url.pathname, "/watch");
      assert.match(resource.youtubeId, /^[A-Za-z0-9_-]{11}$/);
      assert.equal(url.searchParams.get("v"), resource.youtubeId);
      assert.equal(
        youtubeThumbnail(resource),
        `https://i.ytimg.com/vi/${resource.youtubeId}/hqdefault.jpg`,
      );
    } else {
      assert.equal(resource.kind, "collection");
      assert.equal(
        resource.sourceUrl,
        "https://www.cdc.gov/act-early/resources/videos.html",
      );
      assert.equal(resource.youtubeId, undefined);
    }
  }
});

test("video previews reject unsafe or mismatched IDs and non-video links", () => {
  const video = catalog.resources[0];
  for (const change of [
    { youtubeId: "../image" },
    { youtubeId: "another_id1x" },
    { sourceUrl: "https://example.org/watch?v=" + video.youtubeId },
    { sourceUrl: "https://www.youtube.com/results?search_query=development" },
    { sourceUrl: "javascript:alert(1)" },
    { kind: "search" },
    { kind: "collection" },
    { availability: "unavailable" },
    { youtubeId: undefined },
  ])
    assert.equal(youtubeThumbnail({ ...video, ...change }), undefined);
});
