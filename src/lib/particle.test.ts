import { expect, it } from "vitest";
import { particle } from "./particle";

it("받침이 있으면 앞 조사, 없으면 뒤 조사, 한글이 아니면 둘 다", () => {
  expect(particle("마탑", "과", "와")).toBe("과");
  expect(particle("레아 ", "과", "와")).toBe("와");
  expect(particle("잿빛 왕관", "을", "를")).toBe("을");
  expect(particle("abc", "을", "를")).toBe("을(를)");
});
