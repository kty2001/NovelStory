import { describe, expect, it } from "vitest";
import { EXPORT_FORMAT, ExportFormatError, SCHEMA_VERSION, upgradeExport } from "./exportFormat";

describe("upgradeExport", () => {
  it("형식이 아니면 거부", () => {
    for (const raw of [null, "x", {}, { format: "other", schemaVersion: 1 }]) {
      expect(() => upgradeExport(raw)).toThrow(ExportFormatError);
    }
  });

  it("더 새로운 버전은 거부", () => {
    const raw = { format: EXPORT_FORMAT, schemaVersion: SCHEMA_VERSION + 1 };
    expect(() => upgradeExport(raw)).toThrow(expect.objectContaining({ reason: "newer" }));
  });

  it("현재 버전은 그대로 통과", () => {
    const raw = { format: EXPORT_FORMAT, schemaVersion: SCHEMA_VERSION, novel: { id: "n1" } };
    expect(upgradeExport(raw)).toEqual(raw);
  });

  it("이전 버전은 변환을 차례로 적용", () => {
    const raw = { format: EXPORT_FORMAT, schemaVersion: SCHEMA_VERSION - 1, log: [] as number[] };
    const steps = {
      [SCHEMA_VERSION - 1]: (d: typeof raw) => ({
        ...d,
        schemaVersion: d.schemaVersion + 1,
        log: [...d.log, d.schemaVersion],
      }),
    };
    expect(upgradeExport(raw, steps as never)).toMatchObject({
      schemaVersion: SCHEMA_VERSION,
      log: [SCHEMA_VERSION - 1],
    });
  });

  it("변환이 빠져 있으면 거부", () => {
    const raw = { format: EXPORT_FORMAT, schemaVersion: SCHEMA_VERSION - 1 };
    expect(() => upgradeExport(raw, {})).toThrow(ExportFormatError);
  });
});
