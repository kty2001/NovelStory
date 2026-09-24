import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  ViewportPortal,
  useNodesState,
  useReactFlow,
  useViewport,
  type Node,
} from "@xyflow/react";
import { expose } from "../shared/expose";
import { dropOverlaps, pickStep, snapTick, tickToX, xToTick, type Collapsed, type Label, type Scale } from "./timeAxis";

const PX_PER_TICK = 120;
const COLLAPSED_PX = 48;
const MAX_TICK = 60;
const LABEL_FONT = "500 12px Pretendard Variable, sans-serif";
const TICK_LABELS: Record<number, string> = {
  0: "프롤로그",
  3: "1년차 봄",
  4: "1년차 여름",
  5: "1년차 가을",
  10: "왕국력 302년",
  41: "10년 후",
};
const INITIAL_COLLAPSED: Collapsed[] = [{ from: 12, to: 40 }];

type Block = { id: string; tick: number | null; lane: "event" | "state"; title: string; undatedX?: number };
const BLOCKS: Block[] = [
  { id: "e1", tick: 0, lane: "event", title: "왕자 탄생" },
  { id: "e2", tick: 3, lane: "event", title: "첫 만남" },
  { id: "e3", tick: 10, lane: "event", title: "전쟁 발발" },
  { id: "e4", tick: 20, lane: "event", title: "공백기 사건" },
  { id: "e5", tick: 41, lane: "event", title: "귀환" },
  { id: "s1", tick: 3, lane: "state", title: "홍길동 등장" },
  { id: "u1", tick: null, lane: "event", title: "시점 불명 사건", undatedX: -420 },
];

const measure = (() => {
  const ctx = document.createElement("canvas").getContext("2d")!;
  return (text: string) => {
    ctx.font = LABEL_FONT;
    return Math.ceil(ctx.measureText(text).width) + 12; // 좌우 패딩
  };
})();

const toNode = (b: Block, s: Scale): Node => ({
  id: b.id,
  position: { x: b.tick === null ? b.undatedX! : tickToX(b.tick, s), y: b.lane === "event" ? -110 : 50 },
  data: { label: b.title },
  style: {
    width: 120,
    borderRadius: 12,
    border: "none",
    background: b.lane === "event" ? "#ffb084" : "#a4d4c5",
    fontSize: 13,
  },
});

function Axis({ scale, collapsed, onExpand }: { scale: Scale; collapsed: Collapsed[]; onExpand: (c: Collapsed) => void }) {
  const { x: vx, zoom } = useViewport();
  const width = typeof window === "undefined" ? 1440 : window.innerWidth;

  const labels = useMemo(() => {
    const left = Math.max(0, xToTick(Math.max(0, -vx / zoom), scale) ?? 0);
    const right = xToTick(Math.max(0, (width - vx) / zoom), scale) ?? 0;
    const step = pickStep(PX_PER_TICK, zoom, 56);
    const hidden = (t: number) => collapsed.some((c) => t > c.from && t < c.to);
    const out: Label[] = [];
    const add = (t: number, priority: number) => {
      if (t < 0 || t > MAX_TICK || hidden(t)) return;
      const text = TICK_LABELS[t] ?? String(t);
      out.push({ key: `t${t}`, x: tickToX(t, scale) * zoom + vx, width: measure(text), text, priority });
    };
    for (let t = Math.floor(left / step) * step; t <= Math.ceil(right) + step; t += step) add(t, 0);
    for (const t of Object.keys(TICK_LABELS).map(Number)) if (t >= left - 1 && t <= right + 1) add(t, 1);
    for (const c of collapsed) {
      const text = `≈ ${c.from}~${c.to}`;
      out.push({
        key: `c${c.from}`,
        x: (tickToX(c.from, scale) + COLLAPSED_PX / 2) * zoom + vx,
        width: measure(text),
        text,
        priority: 2,
      });
    }
    // 같은 눈금 중복 제거 후 겹침 제거
    const unique = [...new Map(out.sort((a, b) => b.priority - a.priority).map((l) => [l.key, l])).values()];
    return dropOverlaps(unique);
  }, [vx, zoom, scale, collapsed, width]);

  const axisRight = tickToX(MAX_TICK, scale);
  return (
    <ViewportPortal>
      {/* 시점 미정 영역 */}
      <div
        data-testid="undated-zone"
        className="absolute rounded-2xl border-[1.5px] border-dashed border-muted bg-[#faf5e8]"
        style={{ transform: "translate(-560px, -220px)", width: 500, height: 440 }}
      >
        <span className="absolute left-3 top-2 text-xs text-muted">시점 미정</span>
      </div>
      {/* 축 선 */}
      <div className="absolute bg-ink" style={{ transform: "translate(0px, -1px)", width: axisRight, height: 2 }} />
      {/* 접힌 구간 표시 */}
      {collapsed.map((c) => (
        <div
          key={c.from}
          className="absolute bg-[#ebe6d6]"
          style={{ transform: `translate(${tickToX(c.from, scale)}px, -6px)`, width: COLLAPSED_PX, height: 12 }}
        />
      ))}
      {/* 라벨: 화면 크기 고정을 위해 1/zoom 역배율 */}
      {labels.map((l) => {
        const flowX = (l.x - vx) / zoom;
        const marker = l.key.startsWith("c");
        return (
          <div key={l.key} className="absolute" style={{ transform: `translate(${flowX}px, 8px)` }}>
            <div
              className={`tick-label absolute whitespace-nowrap rounded px-1.5 text-xs font-medium tabular-nums ${
                marker ? "nopan cursor-pointer bg-[#ebe6d6]" : "text-muted"
              }`}
              // ViewportPortal 내용은 기본적으로 포인터 이벤트를 받지 않음 → 클릭 가능한 요소만 허용
              style={{
                transform: `scale(${1 / zoom}) translateX(-50%)`,
                transformOrigin: "0 0",
                pointerEvents: marker ? "all" : undefined,
              }}
              data-key={l.key}
              onClick={marker ? () => onExpand(collapsed.find((c) => `c${c.from}` === l.key)!) : undefined}
            >
              {l.text}
            </div>
          </div>
        );
      })}
    </ViewportPortal>
  );
}

function Board() {
  const [collapsed, setCollapsed] = useState<Collapsed[]>(INITIAL_COLLAPSED);
  const scale = useMemo<Scale>(() => ({ pxPerTick: PX_PER_TICK, collapsed, collapsedPx: COLLAPSED_PX }), [collapsed]);
  const blocks = useRef<Block[]>(BLOCKS);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(BLOCKS.map((b) => toNode(b, scale)));
  const { setViewport, getViewport } = useReactFlow();

  // 접기·펼치기 시 눈금 기준으로 블록 위치 재계산
  useEffect(() => {
    setNodes(blocks.current.map((b) => toNode(b, scale)));
  }, [scale, setNodes]);

  const onNodeDragStop = useCallback(
    (_: unknown, node: Node) => {
      const tick = snapTick(node.position.x, scale);
      blocks.current = blocks.current.map((b) =>
        b.id === node.id ? { ...b, tick, undatedX: tick === null ? node.position.x : undefined } : b,
      );
      setNodes(blocks.current.map((b) => toNode(b, scale)));
    },
    [scale, setNodes],
  );

  useEffect(() => {
    expose("c4", {
      setViewport: (v: { x: number; y: number; zoom: number }) => setViewport(v),
      getViewport,
      labelBoxes: () =>
        [...document.querySelectorAll<HTMLElement>(".tick-label")].map((el) => {
          const r = el.getBoundingClientRect();
          return { key: el.dataset.key, text: el.textContent, left: r.left, right: r.right, top: r.top, bottom: r.bottom };
        }),
      blockTicks: () => Object.fromEntries(blocks.current.map((b) => [b.id, b.tick])),
      collapsed: () => collapsed,
    });
  }, [setViewport, getViewport, collapsed]);

  return (
    <div className="h-full">
      <div className="absolute left-4 top-4 z-10 rounded-lg bg-white p-3 text-sm shadow">
        C4 시간축 — 블록을 끌면 눈금에 스냅, 왼쪽 점선 영역은 시점 미정. ≈ 표시 클릭 시 펼침
        {collapsed.length === 0 && (
          <button className="ml-2 underline" onClick={() => setCollapsed(INITIAL_COLLAPSED)}>
            다시 접기
          </button>
        )}
      </div>
      <ReactFlow
        nodes={nodes}
        onNodesChange={onNodesChange}
        onNodeDragStop={onNodeDragStop}
        minZoom={0.05}
        maxZoom={2}
        defaultViewport={{ x: 640, y: 400, zoom: 1 }}
      >
        <Axis scale={scale} collapsed={collapsed} onExpand={(c) => setCollapsed((cs) => cs.filter((x) => x !== c))} />
      </ReactFlow>
    </div>
  );
}

export default function C4() {
  return (
    <ReactFlowProvider>
      <Board />
    </ReactFlowProvider>
  );
}
