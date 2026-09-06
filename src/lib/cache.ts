import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

/**
 * Disk-backed cache. Keys are hashed, so a calendar token never lands on disk
 * in a readable form and cannot be recovered from a cache filename.
 */
const DIR = process.env.CACHE_DIR || join(tmpdir(), "dtu-semester-cache");

export function cacheKey(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

type Entry<T> = { storedAt: number; value: T };

export async function readCache<T>(key: string, maxAgeMs: number): Promise<{ value: T; storedAt: number; stale: boolean } | null> {
  try {
    const text = await readFile(join(DIR, `${key}.json`), "utf8");
    const entry = JSON.parse(text) as Entry<T>;
    return { value: entry.value, storedAt: entry.storedAt, stale: Date.now() - entry.storedAt > maxAgeMs };
  } catch {
    return null;
  }
}

export async function writeCache<T>(key: string, value: T): Promise<void> {
  try {
    await mkdir(DIR, { recursive: true });
    await writeFile(join(DIR, `${key}.json`), JSON.stringify({ storedAt: Date.now(), value } satisfies Entry<T>));
  } catch {
    // A read-only or full volume must not take the request down.
  }
}
