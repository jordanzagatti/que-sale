import type { Evento, EventSource } from "@/lib/types";

export type SourceMethod = "api" | "jsonld" | "rss" | "html";
export type SourceCoverage = "national" | "city" | "venue";
export type LegalStatus = "ok" | "review" | "blocked";

export type SourcePolicy = {
  id: EventSource;
  name: string;
  coverage: SourceCoverage;
  method: SourceMethod;
  /** Si es false, el pipeline safe nunca lo ejecuta. */
  allowedInProd: boolean;
  legalStatus: LegalStatus;
  attribution?: string;
  rateLimitMs: number;
  cities?: string[];
  notes?: string;
};

export type SourceAdapter = SourcePolicy & {
  fetch: () => Promise<Partial<Evento>[]>;
};

export type IngestMode = "safe" | "experimental";
