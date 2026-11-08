#!/usr/bin/env node
/**
 * MapLibre GL 6 runs GeoJSON/tile parsing in a module worker
 * (`maplibre-gl-worker.mjs`) that imports `./maplibre-gl-shared.mjs` as a
 * sibling. Turbopack emits only the worker as a hashed asset, so the sibling
 * 404s, the worker never starts, and county layers never draw.
 *
 * Copy both files side by side into `public/maplibre/<version>/` so
 * `src/lib/maplibre.ts` can point `setWorkerUrl` at a same-origin path.
 * The version folder keeps the pair in lockstep across upgrades and busts caches.
 */
import { copyFileSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(root, "package.json"));
const pkgPath = require.resolve("maplibre-gl/package.json");
const { version } = JSON.parse(readFileSync(pkgPath, "utf8"));
const dist = join(dirname(pkgPath), "dist");

const outRoot = join(root, "public", "maplibre");
const outDir = join(outRoot, version);

rmSync(outRoot, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  copyFileSync(join(dist, file), join(outDir, file));
}

console.log(`Copied MapLibre ${version} worker to public/maplibre/${version}/`);
