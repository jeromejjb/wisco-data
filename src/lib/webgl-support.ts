/**
 * MapLibre 6 requires WebGL2. Firefox Developer Edition often fails when
 * MapLibre asks for a high-performance context, or when WebGL is blocked.
 * Probe with the same attributes we pass into `new Map()`.
 */
export const MAP_WEBGL_ATTRIBUTES = {
  antialias: false,
  preserveDrawingBuffer: false,
  powerPreference: "default",
  failIfMajorPerformanceCaveat: false,
  desynchronized: false,
} as const;

export type WebGL2Probe = {
  ok: boolean;
  /** Browser `webglcontextcreationerror` status, when present. */
  statusMessage: string | null;
};

type GetContext = (
  contextId: string,
  attributes?: WebGLContextAttributes
) => unknown;

function tryWebGL2(getContext: GetContext): WebGL2Probe {
  let statusMessage: string | null = null;
  try {
    const gl = getContext("webgl2", { ...MAP_WEBGL_ATTRIBUTES });
    if (gl && typeof gl === "object" && "getExtension" in gl) {
      const lose = (gl as WebGL2RenderingContext).getExtension("WEBGL_lose_context");
      lose?.loseContext();
      return { ok: true, statusMessage: null };
    }
  } catch (err) {
    statusMessage = err instanceof Error ? err.message : String(err);
  }
  return { ok: false, statusMessage };
}

export function probeWebGL2(getContext?: GetContext): WebGL2Probe {
  if (getContext) return tryWebGL2(getContext);
  if (typeof document === "undefined") {
    return { ok: false, statusMessage: "server" };
  }
  const el = document.createElement("canvas");
  let creationStatus: string | null = null;
  el.addEventListener(
    "webglcontextcreationerror",
    (event) => {
      creationStatus = (event as WebGLContextEvent).statusMessage ?? null;
    },
    { once: true }
  );
  const result = tryWebGL2((type, attrs) => el.getContext(type as "webgl2", attrs));
  if (!result.ok && creationStatus) return { ok: false, statusMessage: creationStatus };
  return result;
}

export function isGpuInitializationError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return typeof error === "string" && /webgl2 is required/i.test(error);
  }
  const name = "name" in error ? String(error.name) : "";
  const message = "message" in error ? String(error.message) : "";
  return (
    name === "GPUInitializationError" ||
    /webgl2 is required/i.test(message) ||
    /failed to initialize webgl/i.test(message) ||
    /webgl disabled/i.test(message)
  );
}

export function webGLUnavailableCopy(probe?: WebGL2Probe): {
  title: string;
  body: string;
  steps: string[];
} {
  const status = probe?.statusMessage?.toLowerCase() ?? "";
  const firefoxish = /about:support|allowwebgl2|webgl disabled/.test(status);
  return {
    title: "This map needs WebGL2",
    body: firefoxish
      ? "Firefox Developer Edition has WebGL turned off, so the map cannot draw. That is a browser setting, not a Workways outage."
      : "The map needs WebGL2. Firefox Developer Edition often blocks it (fingerprinting protection or hardware acceleration off).",
    steps: [
      "In Firefox open about:support and check Graphics → WebGL 2 (it should not say Blocked or Disabled).",
      "Settings → General → Performance: turn on “Use hardware acceleration when available”.",
      "about:config: set webgl.disabled to false. If you use fingerprinting protection, turn that off for this site — it often disables WebGL.",
    ],
  };
}
