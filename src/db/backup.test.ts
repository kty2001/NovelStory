import { describe, expect, it } from "vitest";
import { novel } from "../test/fixtures";
import { backupNotice, snoozeUntil } from "./backup";

const DAY = 24 * 60 * 60 * 1000;
const T0 = Date.parse("2026-09-01T00:00:00.000Z");
const at = (ms: number) => new Date(T0 + ms);
const iso = (ms: number) => at(ms).toISOString();

const created = { ...novel("n1"), createdAt: iso(0), updatedAt: iso(0) };
const exported = { ...created, lastExportedAt: iso(0), updatedAt: iso(DAY) };

describe("backupNotice", () => {
  it("내보낸 적 없으면 생성 후 3일부터", () => {
    expect(backupNotice(created, undefined, at(3 * DAY - 1))).toBeNull();
    expect(backupNotice(created, undefined, at(3 * DAY))).toEqual({ daysSince: null });
  });

  it("내보낸 뒤 변경이 있으면 7일부터", () => {
    expect(backupNotice(exported, undefined, at(7 * DAY - 1))).toBeNull();
    expect(backupNotice(exported, undefined, at(7 * DAY))).toEqual({ daysSince: 7 });
  });

  it("내보낸 뒤 변경이 없으면 표시 안 함", () => {
    const unchanged = { ...exported, updatedAt: iso(0) };
    expect(backupNotice(unchanged, undefined, at(30 * DAY))).toBeNull();
  });

  it("나중에: 3일간 숨김", () => {
    const now = at(10 * DAY);
    const until = snoozeUntil(now);
    expect(backupNotice(exported, until, at(13 * DAY - 1))).toBeNull();
    expect(backupNotice(exported, until, at(13 * DAY))).toEqual({ daysSince: 13 });
  });
});
