/**
 * One-off backfill: populates city/neighborhood/state on existing
 * `life_groups` rows that already have a `location` string but predate the
 * `AddLifeGroupAddressParts` migration (i.e. were geocoded before
 * `addressdetails=1` was added to the Nominatim call).
 *
 * Throttled to respect Nominatim's usage policy (max ~1 req/sec) — waits
 * 1100ms between requests. Idempotent: only touches rows where city,
 * neighborhood, and state are all still NULL, so re-running is safe.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register scripts/backfill-life-group-address-parts.ts [--dry-run]
 */
import 'dotenv/config';
import { Client } from 'pg';

const DRY_RUN = process.argv.includes('--dry-run');
const THROTTLE_MS = 1100;

interface AddressParts {
  city: string | null;
  neighborhood: string | null;
  state: string | null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function geocodeAddressParts(
  location: string,
): Promise<AddressParts | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=1&q=${encodeURIComponent(location)}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'PazChurchApp/1.0 (contato@igrejapaz.com.br)' },
    });
    if (!response.ok) return null;
    const results = (await response.json()) as Array<{
      address?: {
        city?: string;
        town?: string;
        village?: string;
        municipality?: string;
        suburb?: string;
        neighbourhood?: string;
        city_district?: string;
        state?: string;
      };
    }>;
    const first = results[0];
    if (!first) return null;
    const address = first.address ?? {};
    return {
      city:
        address.city ??
        address.town ??
        address.village ??
        address.municipality ??
        null,
      neighborhood:
        address.suburb ??
        address.neighbourhood ??
        address.city_district ??
        null,
      state: address.state ?? null,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`  geocoding failed for "${location}": ${message}`);
    return null;
  }
}

async function main(): Promise<void> {
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 5432),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  await client.connect();

  try {
    const { rows } = await client.query<{
      id: number;
      name: string;
      location: string;
    }>(
      `SELECT id, name, location FROM life_groups
       WHERE location IS NOT NULL AND location <> ''
         AND city IS NULL AND neighborhood IS NULL AND state IS NULL
       ORDER BY id ASC`,
    );

    console.log(
      `${DRY_RUN ? '[dry-run] ' : ''}Found ${rows.length} life group(s) needing address-part backfill.`,
    );

    let updated = 0;
    let skipped = 0;

    for (const row of rows) {
      console.log(`- #${row.id} ${row.name}: "${row.location}"`);
      const parts = await geocodeAddressParts(row.location);
      if (!parts || (!parts.city && !parts.neighborhood && !parts.state)) {
        console.log('    no address parts resolved, skipping');
        skipped += 1;
      } else {
        console.log(
          `    -> city=${parts.city ?? 'null'} neighborhood=${parts.neighborhood ?? 'null'} state=${parts.state ?? 'null'}`,
        );
        if (!DRY_RUN) {
          await client.query(
            `UPDATE life_groups SET city = $1, neighborhood = $2, state = $3 WHERE id = $4`,
            [parts.city, parts.neighborhood, parts.state, row.id],
          );
        }
        updated += 1;
      }

      await sleep(THROTTLE_MS);
    }

    console.log(
      `${DRY_RUN ? '[dry-run] ' : ''}Done. Updated ${updated}, skipped ${skipped}.`,
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
