import { useCallback, useMemo, useRef, useState } from "react";
import { useStore, useViewport, ViewportPortal } from "@xyflow/react";
import { Eraser, Pencil, Plus } from "lucide-react";
import { MenuList, type MenuItem } from "../../components/Menu";
import { useDismiss } from "../../components/useDismiss";
import type { TimeScale } from "../../db/types";
import { insertTickAt, setTimeScale, useNovelStore } from "../../store/novelStore";
import { dropOverlaps, pickStep, tickToX, xToTick, type Label } from "./timeAxis";

// 라벨 사이 최소 간격(화면 px). 줌이 작으면 1·2·5 배수로 눈금을 건너뜀
const MIN_GAP_PX = 56;

// 입력 확정 시점의 최신 라벨 (편집 중 다른 변경이 있어도 덮어쓰지 않게)
const currentLabels = () => useNovelStore.getState().board?.timeScale.tickLabels ?? {};

const measure = (() => {
  let ctx: CanvasRenderingContext2D | null = null;
  return (text: string, bold: boolean) => {
    ctx ??= document.createElement("canvas").getContext("2d");
    if (!ctx) return text.length * 8 + 12;
    ctx.font = `${bold ? 600 : 500} 12px "Pretendard Variable", sans-serif`;
    return Math.ceil(ctx.measureText(text).width) + 12; // 좌우 패딩
  };
})();

type TickLabel = Label & { tick: number; named: boolean };

// 보이는 범위의 눈금 라벨 계산 (화면 좌표로 겹침 제거)
function useTickLabels(scale: TimeScale, editing: number | null) {
  const { x: vx, zoom } = useViewport();
  const width = useStore((s) => s.width);
  return useMemo(() => {
    const left = xToTick(Math.max(0, -vx / zoom), scale) ?? 0;
    const right = xToTick(Math.max(0, (width - vx) / zoom), scale) ?? 0;
    const step = pickStep(scale.pxPerTick, zoom, MIN_GAP_PX);
    const hidden = (t: number) => scale.collapsed.some((c) => t > c.from && t < c.to);
    const out = new Map<number, TickLabel>();
    const add = (t: number, priority: number) => {
      if (t < 0 || hidden(t) || (out.get(t)?.priority ?? -1) >= priority) return;
      const named = scale.tickLabels[t] !== undefined;
      const text = scale.tickLabels[t] ?? String(t);
      const x = tickToX(t, scale) * zoom + vx;
      out.set(t, { key: `t${t}`, tick: t, named, x, width: measure(text, named), text, priority });
    };
    for (let t = Math.floor(left / step) * step; t <= Math.ceil(right) + step; t += step) add(t, 0);
    for (const t of Object.keys(scale.tickLabels).map(Number)) {
      if (t >= left - 1 && t <= right + 1) add(t, 1);
    }
    if (editing !== null) add(editing, 9); // 편집 중인 눈금은 항상 표시
    return dropOverlaps([...out.values()]) as TickLabel[];
  }, [vx, zoom, width, scale, editing]);
}

function LabelInput({
  tick,
  initial,
  onDone,
}: {
  tick: number;
  initial: string;
  onDone: () => void;
}) {
  const done = useRef(false);
  const finish = (value: string | null) => {
    if (done.current) return;
    done.current = true;
    onDone();
    if (value === null) return;
    const tickLabels = { ...currentLabels() };
    const text = value.trim();
    if (text) tickLabels[tick] = text;
    else delete tickLabels[tick];
    setTimeScale({ tickLabels });
  };
  return (
    <input
      aria-label={`눈금 ${tick} 라벨`}
      autoFocus
      defaultValue={initial}
      className="nodrag nopan nowheel absolute top-2 w-32 -translate-x-1/2 rounded-xs border border-ink bg-canvas px-1.5 py-0.5 text-caption text-ink outline-none"
      style={{ pointerEvents: "all" }}
      onFocus={(e) => e.currentTarget.select()}
      onKeyDown={(e) => {
        // 한글 조합 중 Enter는 조합 확정용 (C1·C2)
        if (e.nativeEvent.isComposing || e.keyCode === 229) return;
        if (e.key === "Enter") finish(e.currentTarget.value);
        else if (e.key === "Escape") finish(null);
      }}
      onBlur={(e) => finish(e.currentTarget.value)}
    />
  );
}

// 시간축: 축 선 · 눈금 · 라벨 (UC-14). 보드 좌표 x = tickToX(t), 축 y = 0
export default function Axis({ scale }: { scale: TimeScale }) {
  const { x: vx, zoom } = useViewport();
  const width = useStore((s) => s.width);
  const [editing, setEditing] = useState<number | null>(null);
  const [menu, setMenu] = useState<{ tick: number; x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeMenu = useCallback(() => setMenu(null), []);
  useDismiss(menuRef, menu !== null, closeMenu);
  const labels = useTickLabels(scale, editing);

  const axisLeft = Math.max(0, -vx / zoom);
  const axisRight = (width - vx) / zoom;

  const menuItems = (t: number): MenuItem[] => [
    { label: "앞에 눈금 삽입", icon: <Plus size={14} />, onSelect: () => insertTickAt(t) },
    { label: "라벨 편집", icon: <Pencil size={14} />, onSelect: () => setEditing(t) },
    {
      label: "라벨 지우기",
      icon: <Eraser size={14} />,
      disabled: scale.tickLabels[t] === undefined,
      onSelect: () => {
        const tickLabels = { ...scale.tickLabels };
        delete tickLabels[t];
        setTimeScale({ tickLabels });
      },
    },
  ];

  return (
    <>
      <ViewportPortal>
        {axisRight > axisLeft && (
          <div
            data-testid="time-axis"
            className="absolute bg-ink"
            style={{
              transform: `translate(${axisLeft}px, ${-1 / zoom}px)`,
              width: axisRight - axisLeft,
              height: 2 / zoom,
            }}
          />
        )}
        {labels.map((l) => (
          <div
            key={l.key}
            className="absolute"
            style={{ transform: `translate(${(l.x - vx) / zoom}px, 0px)` }}
          >
            {/* 화면 크기 고정: 1/zoom 역배율 */}
            <div style={{ transform: `scale(${1 / zoom})`, transformOrigin: "0 0" }}>
              <div className="absolute -top-1.5 h-3 w-px -translate-x-1/2 bg-ink" />
              {editing === l.tick ? (
                <LabelInput
                  tick={l.tick}
                  initial={scale.tickLabels[l.tick] ?? ""}
                  onDone={() => setEditing(null)}
                />
              ) : (
                <button
                  type="button"
                  data-tick={l.tick}
                  className={`nodrag nopan tick-label absolute top-2 -translate-x-1/2 rounded-xs px-1.5 text-caption whitespace-nowrap tabular-nums hover:bg-surface-card ${l.named ? "font-semibold text-ink" : "text-muted"}`}
                  // ViewportPortal 내용은 포인터 이벤트를 받지 않음 → 라벨만 허용
                  style={{ pointerEvents: "all" }}
                  onClick={() => setEditing(l.tick)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setMenu({ tick: l.tick, x: e.clientX, y: e.clientY });
                  }}
                >
                  {l.text}
                </button>
              )}
            </div>
          </div>
        ))}
      </ViewportPortal>
      {menu && (
        <div ref={menuRef} className="fixed z-20" style={{ left: menu.x, top: menu.y }}>
          <MenuList items={menuItems(menu.tick)} onClose={closeMenu} />
        </div>
      )}
    </>
  );
}
