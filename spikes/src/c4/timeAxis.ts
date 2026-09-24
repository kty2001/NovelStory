// 작중 시간 = 상대 순서 정수 눈금(0 이상). x < 0 영역은 "시점 미정 영역"
export type Collapsed = { from: number; to: number }; // from~to 사이를 접어 collapsedPx 폭으로 표시
export type Scale = { pxPerTick: number; collapsed: Collapsed[]; collapsedPx: number };

const sorted = (cs: Collapsed[]) => [...cs].filter((c) => c.to > c.from).sort((a, b) => a.from - b.from);

// 접힌 구간이 줄인 폭
const shrink = (c: Collapsed, s: Scale) => (c.to - c.from) * s.pxPerTick - s.collapsedPx;

export function tickToX(t: number, s: Scale): number {
  let x = t * s.pxPerTick;
  for (const c of sorted(s.collapsed)) {
    if (t >= c.to) x -= shrink(c, s);
    else if (t > c.from) {
      const r = (t - c.from) / (c.to - c.from);
      x -= (t - c.from) * s.pxPerTick - r * s.collapsedPx;
    }
  }
  return x;
}

// x → 눈금(소수). x < 0 이면 시점 미정(null)
export function xToTick(x: number, s: Scale): number | null {
  if (x < 0) return null;
  let tickBase = 0;
  let xBase = 0;
  for (const c of sorted(s.collapsed)) {
    const xFrom = xBase + (c.from - tickBase) * s.pxPerTick;
    if (x <= xFrom) break;
    const xTo = xFrom + s.collapsedPx;
    if (x < xTo) return c.from + ((x - xFrom) / s.collapsedPx) * (c.to - c.from);
    tickBase = c.to;
    xBase = xTo;
  }
  return tickBase + (x - xBase) / s.pxPerTick;
}

// 가장 가까운 눈금으로 스냅. 접힌 구간 안이면 가까운 경계로
export function snapTick(x: number, s: Scale): number | null {
  const t = xToTick(x, s);
  if (t === null) return null;
  const inside = sorted(s.collapsed).find((c) => t > c.from && t < c.to);
  if (inside) return t - inside.from < inside.to - t ? inside.from : inside.to;
  return Math.round(t);
}

// at 위치에 눈금 1칸 삽입: at 이상인 블록·라벨·접힌 구간을 뒤로 1칸
export function insertTick<T extends { tick: number }>(
  at: number,
  items: T[],
  labels: Record<number, string>,
  collapsed: Collapsed[],
) {
  const shift = (t: number) => (t >= at ? t + 1 : t);
  return {
    items: items.map((i) => ({ ...i, tick: shift(i.tick) })),
    labels: Object.fromEntries(Object.entries(labels).map(([k, v]) => [shift(Number(k)), v])),
    collapsed: collapsed.map((c) => ({ from: shift(c.from), to: c.to >= at ? c.to + 1 : c.to })),
  };
}

// 화면에 그릴 눈금 간격: 1·2·5 배수 중 라벨이 겹치지 않는 최소 간격
export function pickStep(pxPerTick: number, zoom: number, minGapPx: number): number {
  for (let base = 1; ; base *= 10) {
    for (const m of [1, 2, 5]) {
      const step = base * m;
      if (step * pxPerTick * zoom >= minGapPx) return step;
    }
  }
}

export type Label = { key: string; x: number; width: number; text: string; priority: number };

// 화면 좌표 기준으로 겹치는 라벨 제거 (우선순위 높은 라벨 먼저 배치)
export function dropOverlaps(labels: Label[], gap = 8): Label[] {
  const kept: Label[] = [];
  const order = [...labels].sort((a, b) => b.priority - a.priority || a.x - b.x);
  for (const l of order) {
    const left = l.x - l.width / 2;
    const right = l.x + l.width / 2;
    const hit = kept.some((k) => left < k.x + k.width / 2 + gap && right > k.x - k.width / 2 - gap);
    if (!hit) kept.push(l);
  }
  return kept.sort((a, b) => a.x - b.x);
}
