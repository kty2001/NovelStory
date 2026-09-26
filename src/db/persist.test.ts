import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetDb } from "../test/fixtures";
import { db } from "./db";
import { requestPersistOnce } from "./persist";

const stubPersist = (persist?: () => Promise<boolean>) =>
  vi.stubGlobal("navigator", { storage: persist ? { persist } : undefined });

beforeEach(resetDb);
afterEach(() => vi.unstubAllGlobals());

describe("requestPersistOnce", () => {
  it("결과를 기록하고 두 번째부터는 요청하지 않음", async () => {
    const persist = vi.fn().mockResolvedValue(true);
    stubPersist(persist);
    await requestPersistOnce();
    await requestPersistOnce();
    expect(persist).toHaveBeenCalledTimes(1);
    expect(await db.meta.get("persist")).toMatchObject({ granted: true });
  });

  it("거부도 기록", async () => {
    stubPersist(vi.fn().mockResolvedValue(false));
    await requestPersistOnce();
    expect(await db.meta.get("persist")).toMatchObject({ granted: false });
  });

  it("API가 없으면 거부로 기록", async () => {
    stubPersist();
    await requestPersistOnce();
    expect(await db.meta.get("persist")).toMatchObject({ granted: false });
  });

  it("요청이 실패해도 오류를 던지지 않음", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    stubPersist(vi.fn().mockRejectedValue(new Error("x")));
    await expect(requestPersistOnce()).resolves.toBeUndefined();
    expect(await db.meta.get("persist")).toBeUndefined();
  });
});
