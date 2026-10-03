import { useCallback, useRef, useState } from "react";
import { Panel, useReactFlow, useStore } from "@xyflow/react";
import { Check, Maximize, Minus, Plus } from "lucide-react";
import { MenuList } from "../../components/Menu";
import { useDismiss } from "../../components/useDismiss";
import { isImeKey } from "../../lib/keys";

export const ZOOM_MS = 200;
const zoomButton = "flex h-9 min-w-9 items-center justify-center rounded-sm text-button text-ink";
const PRESETS = [25, 50, 75, 100, 150, 200];

// 우하단 줌 컨트롤 (−, %, +, 화면 맞춤). 미니맵 왼쪽에 배치.
// % 클릭 = 배율 메뉴 (직접 입력 + 프리셋)
export default function ZoomControls() {
  const { zoomIn, zoomOut, zoomTo, fitView } = useReactFlow();
  const zoom = useStore((s) => s.transform[2]);
  const minZoom = useStore((s) => s.minZoom);
  const maxZoom = useStore((s) => s.maxZoom);
  const percent = Math.round(zoom * 100);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);

  const apply = (p: number) => {
    const z = Math.min(maxZoom, Math.max(minZoom, p / 100));
    void zoomTo(z, { duration: ZOOM_MS });
  };

  return (
    <Panel
      position="bottom-right"
      className="!right-[216px] flex gap-0.5 rounded-md border border-hairline bg-canvas p-1 shadow-float max-md:!right-0"
    >
      <button
        className={zoomButton}
        aria-label="축소"
        onClick={() => void zoomOut({ duration: ZOOM_MS })}
      >
        <Minus size={16} />
      </button>
      <div ref={ref} className="relative">
        <button
          className={`${zoomButton} px-1 tabular-nums`}
          aria-label="배율"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {percent}%
        </button>
        {open && (
          <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2">
            <label className="flex items-center gap-1 rounded-t-md border border-b-0 border-hairline bg-canvas px-3 pt-2 pb-1 text-body-sm text-muted">
              <input
                aria-label="배율 직접 입력"
                type="number"
                min={Math.round(minZoom * 100)}
                max={Math.round(maxZoom * 100)}
                defaultValue={percent}
                autoFocus
                onFocus={(e) => e.currentTarget.select()}
                className="w-16 rounded-xs border border-hairline bg-canvas px-1.5 py-0.5 text-right text-ink tabular-nums outline-none focus:border-ink"
                // Enter = 적용 (빈 값 · 숫자 아님은 무시), Esc는 useDismiss가 닫음
                onKeyDown={(e) => {
                  if (e.key !== "Enter" || isImeKey(e)) return;
                  const p = Number(e.currentTarget.value);
                  if (!e.currentTarget.value.trim() || !Number.isFinite(p)) return;
                  apply(p);
                  close();
                }}
              />
              %
            </label>
            <MenuList
              className="!min-w-0 rounded-t-none"
              onClose={close}
              items={PRESETS.map((p) => ({
                label: `${p}%`,
                icon: <Check size={14} className={p === percent ? "" : "invisible"} />,
                onSelect: () => apply(p),
              }))}
            />
          </div>
        )}
      </div>
      <button
        className={zoomButton}
        aria-label="확대"
        onClick={() => void zoomIn({ duration: ZOOM_MS })}
      >
        <Plus size={16} />
      </button>
      <button
        className={zoomButton}
        aria-label="화면 맞춤"
        onClick={() => void fitView({ duration: ZOOM_MS, maxZoom: 1 })}
      >
        <Maximize size={16} />
      </button>
    </Panel>
  );
}
