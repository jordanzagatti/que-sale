import { createHash } from "node:crypto";

import { normalizeText } from "@/lib/categories";

export function slugify(value: unknown): string {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function shortHash(value: string, length = 8): string {
  return createHash("sha1").update(value).digest("hex").slice(0, length);
}

export function eventFingerprint(
  title: string,
  startsAt: string,
  city = "",
  venue = "",
): string {
  return [
    normalizeText(title),
    startsAt.slice(0, 16),
    normalizeText(city),
    normalizeText(venue),
  ].join("|");
}

export function eventSlug(
  title: string,
  startsAt: string,
  city = "",
  sourceId = "",
): string {
  const base = slugify(title) || "evento";
  const suffix = shortHash(`${title}|${startsAt}|${city}|${sourceId}`, 6);
  return `${base}-${startsAt.slice(0, 10)}-${suffix}`;
}

/** UUID v5-ish determinístico para agrupar funciones de una misma serie. */
export function stableUuid(value: string): string {
  const hash = createHash("sha1").update(value).digest("hex");
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    `5${hash.slice(13, 16)}`,
    `8${hash.slice(17, 20)}`,
    hash.slice(20, 32),
  ].join("-");
}
