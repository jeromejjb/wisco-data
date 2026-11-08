import { describe, expect, it, vi } from "vitest";
import {
  WISCONSIN_BOUNDS,
  WISCONSIN_CENTER,
  WISCONSIN_FIT_BOUNDS,
  WISCONSIN_IMMERSIVE_PITCH,
  getCartoVectorStyleUrl,
  getDataMapStyle,
  getInitialMapStyle,
  getVoyagerMapStyle,
  streetRasterTiles,
} from "./map-styles";

describe("Wisconsin map frame", () => {
  it("lets a landscape viewport include the south border and Lake Michigan", () => {
    const [[west, south], [east, north]] = WISCONSIN_BOUNDS;
    const [[fitWest, fitSouth], [fitEast, fitNorth]] = WISCONSIN_FIT_BOUNDS;

    expect(west).toBeLessThan(fitWest);
    expect(east).toBeGreaterThan(fitEast);
    expect(south).toBeLessThan(fitSouth);
    expect(north).toBeGreaterThan(fitNorth);

    expect(fitSouth).toBeLessThan(42.5);
    expect(fitEast).toBeGreaterThan(-86.8);
    expect(WISCONSIN_CENTER.lng).toBeGreaterThan(-89.4);
    expect(WISCONSIN_IMMERSIVE_PITCH).toBe(0);
  });
});

describe("raster streets without a CARTO key", () => {
  it("uses Esri tiles instead of unauthenticated CARTO URLs", () => {
    vi.stubEnv("NEXT_PUBLIC_CARTO_API_KEY", "");
    try {
      const streets = getVoyagerMapStyle(false);
      const source = streets.sources.basemap as { tiles: string[] };
      expect(source.tiles.join(" ")).not.toMatch(/cartocdn/);
      expect(source.tiles[0]).toContain("arcgisonline");
      expect(streetRasterTiles(false).url).not.toContain("cartocdn");
      expect(streetRasterTiles(true).url).toContain("World_Dark_Gray_Base");

      const data = getDataMapStyle(false);
      const dataSource = data.sources.basemap as { tiles: string[] };
      expect(dataSource.tiles.join(" ")).not.toMatch(/cartocdn/);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe("CARTO key on tile URLs", () => {
  it("appends ?key= to Voyager raster and the vector style URL", () => {
    vi.stubEnv("NEXT_PUBLIC_CARTO_API_KEY", "test-key");
    try {
      const layer = streetRasterTiles(false);
      expect(layer.url).toContain("rastertiles/voyager");
      expect(layer.url).toContain("key=test-key");
      expect(layer.subdomains).toBe("abcd");

      const vector = getCartoVectorStyleUrl(false);
      expect(vector).toContain("voyager-gl-style/style.json");
      expect(vector).toContain("key=test-key");

      const initial = getInitialMapStyle("streets", false);
      expect(initial).toBe(vector);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
