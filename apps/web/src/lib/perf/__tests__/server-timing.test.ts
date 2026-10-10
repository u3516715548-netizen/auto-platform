import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isPerfServerTimingEnabled,
  withPerfSpan,
} from "@/lib/perf/server-timing";

describe("server-timing", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("is disabled by default", () => {
    vi.stubEnv("PERF_SERVER_TIMING", undefined);
    expect(isPerfServerTimingEnabled()).toBe(false);
  });

  it("enables only when PERF_SERVER_TIMING=1", () => {
    vi.stubEnv("PERF_SERVER_TIMING", "1");
    expect(isPerfServerTimingEnabled()).toBe(true);
    vi.stubEnv("PERF_SERVER_TIMING", "0");
    expect(isPerfServerTimingEnabled()).toBe(false);
  });

  it("does not log when disabled", async () => {
    vi.stubEnv("PERF_SERVER_TIMING", undefined);
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    const value = await withPerfSpan("catalog.vehicles", async () => 42);
    expect(value).toBe(42);
    expect(spy).not.toHaveBeenCalled();
  });

  it("logs duration without unsafe meta keys when enabled", async () => {
    vi.stubEnv("PERF_SERVER_TIMING", "1");
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    const unsafeMeta = {
      count: 3,
      route: "catalog",
      email: "secret@example.com",
    } as { count: number; route: string };
    await withPerfSpan("catalog.vehicles", async () => "ok", unsafeMeta);
    expect(spy).toHaveBeenCalledTimes(1);
    const [message, meta] = spy.mock.calls[0]!;
    expect(String(message)).toMatch(/^\[perf\] catalog\.vehicles /);
    expect(meta).toEqual({ count: 3, route: "catalog" });
    expect(JSON.stringify(meta)).not.toContain("secret");
  });
});
