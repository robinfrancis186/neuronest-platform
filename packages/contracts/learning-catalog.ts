import catalog from "./learning-catalog.json";

export type LearningResource = {
  catalogId: string;
  kind: "search" | "video" | "collection";
  youtubeId?: string;
  sourceUrl: string;
  sourceLabel: string;
  title: string;
  summary: string;
  audience: string;
  review: {
    status: "awaiting_editorial_clinical_review" | "approved";
    reviewer: string | null;
    published: boolean;
  };
  accessibility: {
    captions: "available" | "unverified" | "unavailable";
    textAlternative: "published" | "not_published";
  };
  availability: "available" | "unavailable" | "unknown";
};

export const learningCatalog = catalog as {
  version: number;
  resources: LearningResource[];
};
