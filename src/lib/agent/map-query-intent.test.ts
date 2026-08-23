import { describe, expect, it } from "vitest";
import { inferMapQueryIntent } from "@/lib/agent/map-query-intent";

describe("inferMapQueryIntent", () => {
  it("returns null for empty or meaningless input", () => {
    expect(inferMapQueryIntent("")).toBeNull();
    expect(inferMapQueryIntent("hello world")).toBeNull();
  });

  it("detects unemployment metric queries", () => {
    expect(inferMapQueryIntent("unemployment in Door County")?.metric).toBe("unemployment");
    expect(inferMapQueryIntent("unemployment in Door County")?.flyToCountyId).toBe("door");
  });

  it("detects job searches with city and keyword", () => {
    const intent = inferMapQueryIntent("find CNA jobs in Milwaukee");
    expect(intent?.searchJobs?.keyword).toBe("CNA");
    expect(intent?.searchJobs?.location).toBe("Milwaukee");
    expect(intent?.flyToCountyId).toBe("milwaukee");
  });

  it("detects job searches in La Crosse", () => {
    const intent = inferMapQueryIntent("find jobs in la crosse");
    expect(intent?.searchJobs).toBeTruthy();
    expect(intent?.flyToCountyId).toBe("la-crosse");
    expect(intent?.searchJobs?.location).toBe("La Crosse");
  });

  it("detects Green Bay job searches", () => {
    const intent = inferMapQueryIntent("what jobs are available in green bay");
    expect(intent?.flyToCountyId).toBe("brown");
    expect(intent?.searchJobs?.location).toBe("Green Bay");
  });

  it("detects county compare queries", () => {
    const intent = inferMapQueryIntent("compare Dane vs Milwaukee");
    expect(intent?.highlightCountyIds).toEqual(expect.arrayContaining(["dane", "milwaukee"]));
    expect(intent?.metric).toBe("unemployment");
  });

  it("detects business journal news intent", () => {
    expect(inferMapQueryIntent("company relocation news in Wisconsin")?.bizJournalNews).toBe(true);
  });

  it("prefers job search over wage metric when nursing is mentioned", () => {
    const intent = inferMapQueryIntent("nurse jobs and median wage");
    expect(intent?.searchJobs?.keyword).toBe("nurse");
    expect(intent?.metric).toBeUndefined();
  });

  it("detects transit metro for MCTS queries", () => {
    expect(inferMapQueryIntent("MCTS bus routes near me")?.transitMetro).toBe("milwaukee");
    expect(inferMapQueryIntent("Madison transit coverage")?.transitMetro).toBe("madison");
  });

  it("does not default job-search transit queries to Milwaukee for other cities", () => {
    const intent = inferMapQueryIntent("bus commute to jobs in la crosse");
    expect(intent?.transitMetro).not.toBe("milwaukee");
    expect(intent?.transitMetro).toBe("both");
  });

  it("still infers Milwaukee transit metro for a Milwaukee-area job search", () => {
    const intent = inferMapQueryIntent("bus commute to jobs in Waukesha");
    expect(intent?.transitMetro).toBe("milwaukee");
  });
});
