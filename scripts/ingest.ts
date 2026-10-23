import { config } from "dotenv";

config({ path: [".env.local", ".env"] });

const args = process.argv.slice(2);

function arg(name: string): string | undefined {
  const withEquals = args.find((value) => value.startsWith(`--${name}=`));
  if (withEquals) return withEquals.slice(name.length + 3);

  const index = args.indexOf(`--${name}`);
  if (index !== -1) {
    const next = args[index + 1];
    return next && !next.startsWith("--") ? next : "";
  }

  return undefined;
}

const mode = arg("mode") === "experimental" ? "experimental" : "safe";
const sourceIds = (arg("source") ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const dryRun = args.includes("--dry-run");
const limitPerSource = Number(arg("limit")) || undefined;
const geocodeLimit = Number(arg("geocode-limit")) || undefined;

async function main() {
  const { runIngestion } = await import("../src/lib/ingest");

  try {
    const summaries = await runIngestion({
      mode,
      sourceIds: sourceIds.length ? sourceIds : undefined,
      dryRun,
      limitPerSource,
      geocodeLimit,
    });

    const totals = summaries.reduce(
      (acc, item) => ({
        fetched: acc.fetched + item.fetched,
        inserted: acc.inserted + item.inserted,
        updated: acc.updated + item.updated,
        skipped: acc.skipped + item.skipped,
        errors: acc.errors + item.errors,
      }),
      { fetched: 0, inserted: 0, updated: 0, skipped: 0, errors: 0 },
    );

    console.log("\nResumen", totals);

    if (mode === "safe" && !dryRun) {
      const appUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
      const secret = process.env.REVALIDATE_SECRET ?? process.env.CRON_SECRET;
      if (appUrl && secret) {
        try {
          const res = await fetch(
            `${appUrl.replace(/\/$/, "")}/api/revalidate`,
            {
              method: "POST",
              headers: { Authorization: `Bearer ${secret}` },
            },
          );
          console.log("Revalidación:", res.status);
        } catch (error) {
          console.warn(
            "No se pudo revalidar la home:",
            error instanceof Error ? error.message : error,
          );
        }
      }
    }

    if (
      summaries.length > 0 &&
      summaries.every((item) => item.status === "error")
    ) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(
      "\nIngesta fallida:",
      error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
  }
}

void main();
