import type { LearningResource } from "../../../packages/contracts/learning-catalog";

export function youtubeThumbnail(resource: LearningResource): string | undefined {
  const id = resource.youtubeId;
  if (
    resource.kind !== "video" ||
    resource.availability === "unavailable" ||
    !id ||
    !/^[A-Za-z0-9_-]{11}$/.test(id) ||
    resource.sourceUrl !== `https://www.youtube.com/watch?v=${id}`
  )
    return undefined;
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}
