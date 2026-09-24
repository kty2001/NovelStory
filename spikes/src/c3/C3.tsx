import { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useNodesInitialized,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { expose } from "../shared/expose";

type BlockData = { title: string; tag: string; color: string };
const COLORS = ["#ff4d8b", "#ffb084", "#a4d4c5", "#b8a4ed", "#e8b94a"];

// 실제 사건 블록과 비슷한 DOM 구성
const BlockNode = memo(function BlockNode({ data }: NodeProps<Node<BlockData>>) {
  return (
    <div className="w-44 rounded-xl px-3 py-2 text-sm" style={{ background: data.color }}>
      <p className="line-clamp-2 font-semibold break-keep">{data.title}</p>
      <span className="mt-1 inline-block rounded-full bg-white/70 px-2 text-xs">{data.tag}</span>
    </div>
  );
});

const nodeTypes = { block: BlockNode };

function build(n: number, e: number) {
  const cols = 40;
  const nodes: Node<BlockData>[] = Array.from({ length: n }, (_, i) => ({
    id: `b${i}`,
    type: "block",
    position: { x: (i % cols) * 220, y: Math.floor(i / cols) * 130 },
    data: { title: `사건 ${i} — 왕국의 운명이 걸린 결투`, tag: `태그${i % 7}`, color: COLORS[i % COLORS.length] },
  }));
  const edges: Edge[] = Array.from({ length: Math.min(e, n - 1) }, (_, i) => {
    const s = (i * 7) % n;
    const t = (s + 1 + (i % 3) * cols) % n;
    return { id: `e${i}`, source: `b${s}`, target: `b${t}`, markerEnd: { type: MarkerType.ArrowClosed } };
  });
  return { nodes, edges };
}

// requestAnimationFrame 간격으로 프레임 시간 기록
function recorder() {
  let frames: number[] = [];
  let running = false;
  let last = 0;
  const tick = (t: number) => {
    if (!running) return;
    if (last) frames.push(t - last);
    last = t;
    requestAnimationFrame(tick);
  };
  return {
    start() {
      frames = [];
      last = 0;
      running = true;
      requestAnimationFrame(tick);
    },
    stop() {
      running = false;
      const sorted = [...frames].sort((a, b) => a - b);
      const total = frames.reduce((a, b) => a + b, 0);
      return {
        frames: frames.length,
        avgFps: total ? Math.round((frames.length / total) * 1000 * 10) / 10 : 0,
        p95Ms: Math.round((sorted[Math.floor(sorted.length * 0.95)] ?? 0) * 10) / 10,
      };
    },
  };
}

function Board() {
  const params = new URLSearchParams(location.search);
  const n = Number(params.get("n") ?? 500);
  const e = Number(params.get("e") ?? 300);
  const visibleOnly = params.get("visible") === "1";
  const initial = useMemo(() => build(n, e), [n, e]);
  const [nodes, , onNodesChange] = useNodesState(initial.nodes);
  const { setViewport } = useReactFlow();
  const initialized = useNodesInitialized();
  const t0 = useRef(performance.now());
  const [renderMs, setRenderMs] = useState<number | null>(null);
  const rec = useMemo(recorder, []);

  useEffect(() => {
    if (initialized && renderMs === null) setRenderMs(Math.round(performance.now() - t0.current));
  }, [initialized, renderMs]);

  useEffect(() => {
    expose("c3", {
      ready: () => renderMs !== null,
      renderMs: () => renderMs,
      startRecord: () => rec.start(),
      stopRecord: () => rec.stop(),
      // 줌·팬 애니메이션 (줌 0.5~1.5 왕복, 캔버스 가로질러 이동)
      animate: (ms: number) =>
        new Promise((resolve) => {
          rec.start();
          const begin = performance.now();
          const step = (t: number) => {
            const p = (t - begin) / ms;
            if (p >= 1) return resolve(rec.stop());
            const zoom = 1 + 0.5 * Math.sin(p * Math.PI * 4);
            setViewport({ x: -p * 4000, y: -p * 800, zoom });
            requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }),
    });
  }, [renderMs, rec, setViewport]);

  return (
    <div className="h-full">
      <div className="absolute left-4 top-4 z-10 rounded-lg bg-white p-3 text-sm shadow" data-testid="info">
        노드 {n} · 연결선 {e} · 화면 밖 렌더 생략 {visibleOnly ? "on" : "off"} · 초기 렌더 {renderMs ?? "…"}ms
      </div>
      <ReactFlow
        nodes={nodes}
        edges={initial.edges}
        onNodesChange={onNodesChange}
        nodeTypes={nodeTypes}
        onlyRenderVisibleElements={visibleOnly}
        minZoom={0.05}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
      >
        <Background />
        <MiniMap pannable={false} />
      </ReactFlow>
    </div>
  );
}

export default function C3() {
  return (
    <ReactFlowProvider>
      <Board />
    </ReactFlowProvider>
  );
}
