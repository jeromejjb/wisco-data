import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyQueryAreaSync, resolveQueryCountyId, userAreaFromQueryText } from "@/lib/query-area-sync";

const setChosenArea = vi.fn();
const applyActions = vi.fn();
const selectCounty = vi.fn();

vi.mock("@/lib/store", () => ({
  useAppStore: {
    getState: () => ({ setChosenArea }),
  },
}));

vi.mock("@/lib/map-store", () => ({
  useMapStore: {
    getState: () => ({ applyActions, selectCounty }),
  },
}));

describe("resolveQueryCountyId", () => {
  it("prefers flyToCountyId from intent", () => {
    expect(resolveQueryCountyId("find jobs in la crosse")).toBe("la-crosse");
  });

  it("falls back to city match", () => {
    expect(resolveQueryCountyId("jobs near Green Bay")).toBe("brown");
  });

  it("falls back to county name in text", () => {
    expect(resolveQueryCountyId("unemployment in Door County")).toBe("door");
  });
});

describe("userAreaFromQueryText", () => {
  it("uses city label for display name", () => {
    const area = userAreaFromQueryText("find jobs in la crosse");
    expect(area?.countyId).toBe("la-crosse");
    expect(area?.displayName).toBe("La Crosse");
    expect(area?.metroName).toBe("La Crosse area");
  });

  it("returns null when no geography is found", () => {
    expect(userAreaFromQueryText("hello world")).toBeNull();
  });
});

describe("applyQueryAreaSync", () => {
  beforeEach(() => {
    setChosenArea.mockClear();
    applyActions.mockClear();
    selectCounty.mockClear();
  });

  it("updates stores when a query resolves to a county", () => {
    const ok = applyQueryAreaSync("find jobs in la crosse");
    expect(ok).toBe(true);
    expect(setChosenArea).toHaveBeenCalledWith(
      expect.objectContaining({ countyId: "la-crosse", displayName: "La Crosse" })
    );
    expect(applyActions).toHaveBeenCalledWith([
      expect.objectContaining({ type: "flyTo" }),
      expect.objectContaining({ type: "highlightCounties", countyIds: ["la-crosse"] }),
    ]);
    expect(selectCounty).toHaveBeenCalledWith(
      expect.objectContaining({ countyId: "la-crosse", name: "La Crosse" })
    );
  });

  it("flies to a county for news and metric prompts without opening the county sheet", () => {
    expect(
      applyQueryAreaSync(
        `What's the local impact of this news in Milwaukee? "Plant expansion downtown"`
      )
    ).toBe(true);
    expect(applyActions).toHaveBeenCalled();
    expect(selectCounty).not.toHaveBeenCalled();

    selectCounty.mockClear();
    applyActions.mockClear();
    expect(applyQueryAreaSync("unemployment in Door County")).toBe(true);
    expect(selectCounty).not.toHaveBeenCalled();
  });

  it("returns false for empty or unknown queries", () => {
    expect(applyQueryAreaSync("")).toBe(false);
    expect(applyQueryAreaSync("hello world")).toBe(false);
    expect(setChosenArea).not.toHaveBeenCalled();
  });
});
