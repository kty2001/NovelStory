import { appendFileSync, mkdirSync } from "node:fs";
import { expect, test } from "@playwright/test";

type Stat = { frames: number; avgFps: number; p95Ms: number };

const combos = [200, 500, 1000].flatMap((n) =>
  [false, true].flatMap((visible) => [1, 4].map((throttle) => ({ n, visible, throttle }))),
);

for (const { n, visible, throttle } of combos) {
  test(`C3 n=${n} visibleOnly=${visible} cpu=${throttle}x`, async ({ page }) => {
    const s = await page.context().newCDPSession(page);
    await s.send("Emulation.setCPUThrottlingRate", { rate: throttle });
    await page.goto(`/c3?n=${n}&e=300&visible=${visible ? 1 : 0}`);
    await page.waitForFunction(() => (window.__spike?.c3 as { ready?: () => boolean })?.ready?.(), null, { timeout: 60_000 });
    const renderMs = await page.evaluate(() => (window.__spike.c3 as { renderMs: () => number }).renderMs());

    // 줌·팬 애니메이션 3초
    const anim = (await page.evaluate(() => (window.__spike.c3 as { animate: (ms: number) => Promise<Stat> }).animate(3000))) as Stat;

    // 노드 드래그 2초 (화면 좌상단 노드)
    await page.goto(`/c3?n=${n}&e=300&visible=${visible ? 1 : 0}`);
    await page.waitForFunction(() => (window.__spike?.c3 as { ready?: () => boolean })?.ready?.(), null, { timeout: 60_000 });
    const node = page.locator(".react-flow__node").first();
    const box = (await node.boundingBox())!;
    await page.evaluate(() => (window.__spike.c3 as { startRecord: () => void }).startRecord());
    await page.mouse.move(box.x + 20, box.y + 20);
    await page.mouse.down();
    for (let i = 0; i < 120; i++) {
      await page.mouse.move(box.x + 20 + i * 4, box.y + 20 + Math.sin(i / 10) * 80);
    }
    await page.mouse.up();
    const drag = (await page.evaluate(() => (window.__spike.c3 as { stopRecord: () => Stat }).stopRecord())) as Stat;

    const row = { n, visibleOnly: visible, cpu: `${throttle}x`, renderMs, zoomPanFps: anim.avgFps, zoomPanP95Ms: anim.p95Ms, dragFps: drag.avgFps, dragP95Ms: drag.p95Ms };
    console.log(JSON.stringify(row));
    mkdirSync("test-results", { recursive: true });
    appendFileSync("test-results/c3.jsonl", `${JSON.stringify(row)}\n`); // 워커 재시작에도 결과 유지

    // 합격 기준 (spikes.md): PC 1,000개 50fps / 4x 500개 30fps / 초기 렌더 1초 (스로틀 없음 기준)
    if (throttle === 1 && n === 1000) expect.soft(anim.avgFps, "PC 1,000개 줌·팬 50fps").toBeGreaterThanOrEqual(50);
    if (throttle === 4 && n === 500) expect.soft(anim.avgFps, "4x 500개 줌·팬 30fps").toBeGreaterThanOrEqual(30);
    if (throttle === 1) expect.soft(renderMs, "초기 렌더 1초").toBeLessThanOrEqual(1000);
  });
}
