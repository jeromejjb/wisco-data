type CacheEntry<T> = {
  data: T;
  expiresAt: number;
  fetchedAt: number;
};

const MAX_ENTRIES = 400;
const store = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

function evictIfNeeded() {
  if (store.size <= MAX_ENTRIES) return;
  const extra = store.size - MAX_ENTRIES;
  const oldest = [...store.entries()]
    .sort((a, b) => a[1].fetchedAt - b[1].fetchedAt)
    .slice(0, extra);
  for (const [key] of oldest) store.delete(key);
}

export async function cached<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>,
  options?: { shouldCache?: (value: T) => boolean }
): Promise<T> {
  const hit = store.get(key) as CacheEntry<T> | undefined;
  if (hit && Date.now() < hit.expiresAt) return hit.data;

  const pending = inflight.get(key) as Promise<T> | undefined;
  if (pending) return pending;

  const promise = fn()
    .then((data) => {
      if (!options?.shouldCache || options.shouldCache(data)) {
        store.set(key, { data, expiresAt: Date.now() + ttlMs, fetchedAt: Date.now() });
        evictIfNeeded();
      }
      return data;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}

export function invalidateCache(prefix?: string) {
  if (!prefix) {
    store.clear();
    return;
  }
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

export function getCacheEntriesMatching(prefix: string): { key: string; fetchedAt: number; expiresAt: number }[] {
  const out: { key: string; fetchedAt: number; expiresAt: number }[] = [];
  for (const [key, entry] of store.entries()) {
    if (key.startsWith(prefix)) {
      out.push({ key, fetchedAt: entry.fetchedAt, expiresAt: entry.expiresAt });
    }
  }
  return out;
}

export function getCacheKeyMeta(key: string) {
  const entry = store.get(key);
  if (!entry) return null;
  return {
    fetchedAt: entry.fetchedAt,
    expiresAt: entry.expiresAt,
    stale: Date.now() >= entry.expiresAt,
  };
}

export function listCacheKeys(): string[] {
  return [...store.keys()];
}

/** Test helper */
export function resetCacheStore() {
  store.clear();
  inflight.clear();
}

export const CACHE_MAX_ENTRIES = MAX_ENTRIES;
