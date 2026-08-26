import { describe, expect, it } from "vitest";
import {
  isGpuInitializationError,
  probeWebGL2,
  webGLUnavailableCopy,
} from "./webgl-support";

describe("probeWebGL2", () => {
  it("reports ok when getContext returns a GL object", () => {
    const gl = { getExtension: () => ({ loseContext: () => {} }) };
    expect(probeWebGL2(() => gl).ok).toBe(true);
  });

  it("reports failure when getContext returns null", () => {
    expect(probeWebGL2(() => null)).toEqual({ ok: false, statusMessage: null });
  });
});

describe("isGpuInitializationError", () => {
  it("matches MapLibre's GPUInitializationError", () => {
    expect(
      isGpuInitializationError({
        name: "GPUInitializationError",
        message: "WebGL2 is required to display this map.",
      })
    ).toBe(true);
    expect(isGpuInitializationError(new Error("tile 404"))).toBe(false);
  });
});

describe("webGLUnavailableCopy", () => {
  it("calls out Firefox when the status mentions about:support", () => {
    const copy = webGLUnavailableCopy({
      ok: false,
      statusMessage: "WebGL disabled, see about:support",
    });
    expect(copy.body).toContain("Firefox");
    expect(copy.steps[0]).toContain("about:support");
  });
});
