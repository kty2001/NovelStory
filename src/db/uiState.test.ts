import { beforeEach, expect, it } from "vitest";
import { resetDb } from "../test/fixtures";
import { db } from "./db";
import { patchUiState } from "./uiState";

beforeEach(resetDb);

it("없으면 기본값으로 만들고, 있으면 병합", async () => {
  await patchUiState("n1", { backupSnoozedUntil: "2026-10-01T00:00:00.000Z" });
  expect(await db.uiState.get("n1")).toEqual({
    novelId: "n1",
    viewport: { x: 0, y: 0, zoom: 1 },
    lastTab: "board",
    backupSnoozedUntil: "2026-10-01T00:00:00.000Z",
  });

  await patchUiState("n1", { lastTab: "wiki" });
  expect(await db.uiState.get("n1")).toMatchObject({
    lastTab: "wiki",
    backupSnoozedUntil: "2026-10-01T00:00:00.000Z",
  });
});
