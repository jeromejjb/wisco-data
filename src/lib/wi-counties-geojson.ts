/** Preload & cache Wisconsin county GeoJSON (module singleton) */

let cached: GeoJSON.FeatureCollection | null = null;
let promise: Promise<GeoJSON.FeatureCollection> | null = null;

function enrich(geo: GeoJSON.FeatureCollection): GeoJSON.FeatureCollection {
  const features = geo.features.map((f) => {
    const props = f.properties as { NAME?: string; name?: string; fips?: string } | null;
    if (props?.fips && (props?.name || props?.NAME)) return f;
    return {
      ...f,
      properties: {
        ...f.properties,
        fips: String(f.id ?? props?.fips ?? ""),
        name: props?.NAME ?? props?.name ?? "County",
      },
    };
  });
  return { ...geo, features };
}

export function preloadCountiesGeoJson() {
  if (cached || promise) return;
  promise = fetch("/data/wi-counties.geojson")
    .then((r) => r.json())
    .then((geo: GeoJSON.FeatureCollection) => {
      cached = enrich(geo);
      return cached;
    })
    .catch((err) => {
      promise = null;
      throw err;
    });
}

export function getCountiesGeoJson(): Promise<GeoJSON.FeatureCollection> {
  if (cached) return Promise.resolve(cached);
  if (typeof window === "undefined") {
    return Promise.reject(new Error("getCountiesGeoJson is client-only"));
  }
  preloadCountiesGeoJson();
  return promise!;
}
