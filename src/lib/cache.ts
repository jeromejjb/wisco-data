type CacheEntry<T> = {
  data: T;
  expiresAt: number;
  fetchedAt: number;
};

const store = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

export async function cached<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>
): Promise<T> {
  const hit = store.get(key) as CacheEntry<T> | undefined;
  if (hit && Date.now() < hit.expiresAt) return hit.data;

  const pending = inflight.get(key) as Promise<T> | undefined;
  if (pending) return pending;

  const promise = fn()
    .then((data) => {
      store.set(key, { data, expiresAt: Date.now() + ttlMs, fetchedAt: Date.now() });
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
