import type { CDPSession } from "@playwright/test";

type Pt = { x: number; y: number };

// CDP 멀티터치: 각 손가락의 시작·끝 좌표를 steps 단계로 이동
export async function gesture(s: CDPSession, from: Pt[], to: Pt[], steps = 12, holdMs = 0) {
  const pts = (k: number) =>
    from.map((f, i) => ({ x: f.x + (to[i].x - f.x) * k, y: f.y + (to[i].y - f.y) * k, id: i }));
  await s.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: pts(0) });
  if (holdMs) await new Promise((r) => setTimeout(r, holdMs));
  for (let i = 1; i <= steps; i++) {
    await s.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: pts(i / steps) });
    await new Promise((r) => setTimeout(r, 16));
  }
  await s.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

export async function longPress(s: CDPSession, p: Pt, ms: number) {
  await s.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...p, id: 0 }] });
  await new Promise((r) => setTimeout(r, ms));
  await s.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}
