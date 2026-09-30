import type { WikiDoc } from "../../db/types";
import { useNovelStore } from "../../store/novelStore";
import { stateAt } from "../board/stateCalc";
import { tickText } from "./boardLinks";

// 시점 선택 (F3): 문서 기본값 / 상태 블록이 있는 눈금. 눈금이 없으면 표시 안 함
export default function TimePick({
  ticks,
  value,
  onChange,
}: {
  ticks: number[];
  value: number | null;
  onChange: (t: number | null) => void;
}) {
  const scale = useNovelStore((s) => s.board?.timeScale);
  if (!scale || !ticks.length) return null;
  return (
    <label className="flex items-center gap-1.5">
      <span className="w-12 shrink-0 text-caption text-muted">시점</span>
      <select
        aria-label="시점 선택"
        value={value ?? ""}
        className="rounded-sm border border-hairline bg-canvas px-2 py-1 text-body-sm text-ink"
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      >
        <option value="">문서 기본값</option>
        {ticks.map((t) => (
          <option key={t} value={t}>
            {tickText(scale, t)}
          </option>
        ))}
      </select>
      {value !== null && (
        <span className="text-caption text-muted">
          보드 상태 블록에서 계산 · 편집은 문서 기본값에서
        </span>
      )}
    </label>
  );
}

// 시점 t의 캐릭터 속성 (읽기 전용): 문서 속성 키 + 상태 블록이 더한 키, 기본값과 다르면 강조
export function StateAtTable({ doc, t }: { doc: WikiDoc; t: number }) {
  const items = useNovelStore((s) => s.items);
  const docs = useNovelStore((s) => s.docs);
  const values = stateAt(doc.id, t, items, docs);
  const base = Object.fromEntries(doc.props.map((p) => [p.key, p.value]));
  const keys = [...new Set([...doc.props.map((p) => p.key), ...Object.keys(values)])];
  return (
    <ul aria-label="시점 속성" className="border-t border-hairline">
      {keys.map((key) => {
        const value = values[key] ?? "";
        return (
          <li key={key} data-testid="prop-row" className="flex border-b border-hairline">
            <span className="w-32 shrink-0 px-2 py-1.5 pl-6 text-body-sm text-muted">{key}</span>
            <span
              aria-label={`${key} 값`}
              data-changed={value !== (base[key] ?? "") || undefined}
              className="flex-1 px-2 py-1.5 text-body-sm text-ink data-changed:bg-sticky-yellow"
            >
              {value || <span className="text-muted-soft">—</span>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
