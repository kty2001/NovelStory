import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useStore, useViewport, ViewportPortal } from "@xyflow/react";
import { ArrowRightToLine, Eraser, Pencil, Plus } from "lucide-react";
import { MenuList, type MenuItem } from "../../components/Menu";
import { useDismiss } from "../../components/useDismiss";
import type { TimeScale } from "../../db/types";
import { insertTickAt, setTimeScale, useNovelStore } from "../../store/novelStore";
import {
  dropOverlaps,
  normalizeCollapsed,
  pickStep,
  tickToX,
  xToTick,
  type Collapsed,
  type Label,
} from "./timeAxis";

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
    const inside = (t: number) => scale.collapsed.find((c) => t > c.from && t < c.to);
    const out = new Map<number, TickLabel>();
    const add = (t: number, priority: number) => {
      if (t < 0 || inside(t) || (out.get(t)?.priority ?? -1) >= priority) return;
      const named = scale.tickLabels[t] !== undefined;
      const text = scale.tickLabels[t] ?? String(t);
      const x = tickToX(t, scale) * zoom + vx;
      out.set(t, { key: `t${t}`, tick: t, named, x, width: measure(text, named), text, priority });
    };
    for (let t = Math.floor(left / step) * step; t <= Math.ceil(right) + step; t += step) {
      const c = inside(t);
      if (c)
        t = Math.ceil(c.to / step) * step - step; // 접힌 구간은 건너뜀 (긴 공백도 반복 없이)
      else add(t, 0);
    }
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

// 화면 크기 고정 요소: 보드 좌표 (x, 0)에 두고 1/zoom 역배율
function Fixed({ x, zoom, children }: { x: number; zoom: number; children: ReactNode }) {
  return (
    <div className="absolute" style={{ transform: `translate(${x}px, 0px)` }}>
      <div style={{ transform: `scale(${1 / zoom})`, transformOrigin: "0 0" }}>{children}</div>
    </div>
  );
}

// 구간 선택 중 유지되는 요소 (눈금 라벨 · 접기 버튼). 그 밖을 누르면 선택 취소
const KEEP_RANGE = "data-keep-range";

// 시간축: 축 선 · 눈금 · 라벨 (UC-14) · 구간 접기 (UC-15). 보드 좌표 x = tickToX(t), 축 y = 0
export default function Axis({ scale }: { scale: TimeScale }) {
  const { x: vx, zoom } = useViewport();
  const width = useStore((s) => s.width);
  const [editing, setEditing] = useState<number | null>(null);
  const [menu, setMenu] = useState<{ tick: number; x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeMenu = useCallback(() => setMenu(null), []);
  useDismiss(menuRef, menu !== null, closeMenu);
  const labels = useTickLabels(scale, editing);
  // 구간 선택: Shift+클릭 또는 메뉴 "여기부터 구간 선택" → 다른 눈금 클릭
  const [range, setRange] = useState<{ from: number; to: number | null } | null>(null);

  useEffect(() => {
    if (!range) return;
    const onDown = (e: PointerEvent) => {
      if (!(e.target as Element).closest(`[${KEEP_RANGE}]`)) setRange(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setRange(null);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [range]);

  const clickTick = (t: number, shift: boolean) => {
    if (range) setRange({ from: range.from, to: t === range.from ? null : t });
    else if (shift) setRange({ from: t, to: null });
    else setEditing(t);
  };
  const [a, b] = range ? [range.from, range.to ?? range.from].sort((p, q) => p - q) : [0, 0];
  const collapse = () => {
    setTimeScale({ collapsed: normalizeCollapsed([...scale.collapsed, { from: a, to: b }]) });
    setRange(null);
  };
  const expand = (c: Collapsed) =>
    setTimeScale({ collapsed: scale.collapsed.filter((x) => x.from !== c.from || x.to !== c.to) });

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
    {
      label: "여기부터 구간 선택",
      icon: <ArrowRightToLine size={14} />,
      onSelect: () => setRange({ from: t, to: null }),
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
        {/* 접힌 구간: 축 위 막대 + ≈ 칩 (클릭 = 펼치기) */}
        {scale.collapsed.map((c) => {
          const x = tickToX(c.from, scale);
          return (
            <div key={`c${c.from}`}>
              <div
                className="absolute bg-surface-strong"
                style={{
                  transform: `translate(${x}px, ${-5 / zoom}px)`,
                  width: scale.collapsedPx,
                  height: 10 / zoom,
                }}
              />
              <Fixed x={x + scale.collapsedPx / 2} zoom={zoom}>
                <button
                  type="button"
                  aria-label={`구간 ${c.from}~${c.to} 펼치기`}
                  className="nodrag nopan absolute -top-8 -translate-x-1/2 rounded-full bg-surface-strong px-2 py-0.5 text-caption whitespace-nowrap text-ink tabular-nums hover:bg-hairline"
                  style={{ pointerEvents: "all" }}
                  onClick={() => expand(c)}
                >
                  ≈ {c.from}~{c.to}
                </button>
              </Fixed>
            </div>
          );
        })}
        {/* 선택 중인 구간 + 접기 버튼 */}
        {range && (
          <div
            data-testid="tick-range"
            className="absolute rounded-xs bg-ink/8"
            style={{
              transform: `translate(${tickToX(a, scale) - 4 / zoom}px, ${-15 / zoom}px)`,
              width: tickToX(b, scale) - tickToX(a, scale) + 8 / zoom,
              height: 30 / zoom,
              border: `${1.5 / zoom}px solid var(--color-ink)`,
            }}
          />
        )}
        {range && range.to === null && (
          <Fixed x={tickToX(range.from, scale)} zoom={zoom}>
            <div
              data-testid="tick-range-hint"
              className="absolute -top-14 -translate-x-1/2 rounded-full bg-surface-strong px-2.5 py-1 text-caption whitespace-nowrap text-ink"
            >
              끝 눈금을 클릭 · Esc 취소
            </div>
          </Fixed>
        )}
        {range && range.to !== null && (
          <Fixed x={(tickToX(a, scale) + tickToX(b, scale)) / 2} zoom={zoom}>
            <button
              type="button"
              {...{ [KEEP_RANGE]: "" }}
              className="nodrag nopan absolute -top-14 h-8 -translate-x-1/2 rounded-md bg-primary px-3 text-button whitespace-nowrap text-on-primary"
              style={{ pointerEvents: "all" }}
              onClick={collapse}
            >
              ≈ 구간 {a}~{b} 접기
            </button>
          </Fixed>
        )}
        {labels.map((l) => (
          <Fixed key={l.key} x={(l.x - vx) / zoom} zoom={zoom}>
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
                title="클릭: 라벨 편집 · Shift+클릭: 구간 선택(접기) · 우클릭: 메뉴"
                {...{ [KEEP_RANGE]: "" }}
                className={`nodrag nopan tick-label absolute top-2 -translate-x-1/2 rounded-xs px-1.5 text-caption whitespace-nowrap tabular-nums hover:bg-surface-card ${l.named ? "font-semibold text-ink" : "text-muted"}`}
                // ViewportPortal 내용은 포인터 이벤트를 받지 않음 → 라벨만 허용
                style={{ pointerEvents: "all" }}
                onClick={(e) => clickTick(l.tick, e.shiftKey)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setMenu({ tick: l.tick, x: e.clientX, y: e.clientY });
                }}
              >
                {l.text}
              </button>
            )}
          </Fixed>
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
