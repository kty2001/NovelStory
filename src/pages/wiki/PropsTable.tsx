import { useState, type KeyboardEvent } from "react";
import { GripVertical, Plus, X } from "lucide-react";
import type { WikiProp } from "../../db/types";

// 입력칸 공통: 한글 조합 중 키 무시, Enter = 확정, Esc = 이전 값 복원
function commitKeys(e: KeyboardEvent<HTMLInputElement>, previous: string) {
  if (e.nativeEvent.isComposing || e.keyCode === 229) return;
  if (e.key === "Escape") e.currentTarget.value = previous;
  if (e.key === "Enter" || e.key === "Escape") e.currentTarget.blur();
}

// 이름이 겹치지 않는 새 속성 키
const newKey = (props: WikiProp[]) => {
  const keys = new Set(props.map((p) => p.key));
  let n = 1;
  while (keys.has(n === 1 ? "새 속성" : `새 속성 ${n}`)) n++;
  return n === 1 ? "새 속성" : `새 속성 ${n}`;
};

const inputClass =
  "min-w-0 rounded-xs px-2 py-1.5 text-body-sm text-ink focus:bg-surface-soft focus:outline-none";

// 속성 표 (W-1 ⑥): 2열 키-값, 추가 · 삭제 · ⋮⋮ 끌어서 순서, 같은 키 중복 금지 (data_model 5장).
// keysOnly = 분류 템플릿 키 목록 (W-5, 값 칸 숨김)
export default function PropsTable({
  props,
  onChange,
  keysOnly = false,
}: {
  props: WikiProp[];
  onChange: (props: WikiProp[]) => void;
  keysOnly?: boolean;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [error, setError] = useState("");

  const patch = (i: number, p: WikiProp) => onChange(props.map((x, j) => (j === i ? p : x)));

  const renameKey = (i: number, input: HTMLInputElement) => {
    const key = input.value.trim();
    const old = props[i].key;
    if (key === old) return;
    if (!key || props.some((p, j) => j !== i && p.key === key)) {
      input.value = old;
      if (key) setError(`'${key}' 속성이 이미 있어요`);
      return;
    }
    setError("");
    patch(i, { ...props[i], key });
  };

  const drop = (target: number) => {
    if (dragIndex === null || dragIndex === target) return;
    const next = props.filter((_, j) => j !== dragIndex);
    next.splice(target, 0, props[dragIndex]);
    onChange(next);
    setDragIndex(null);
  };

  return (
    <div>
      <ul aria-label={keysOnly ? "템플릿 속성" : "속성"} className="border-t border-hairline">
        {props.map((p, i) => (
          <li
            // 행은 순번, 입력칸은 값 기준 key: 값이 바뀌면 입력칸만 새로 그림 (포커스 이동 유지)
            key={i}
            data-testid="prop-row"
            className={`group flex items-center border-b border-hairline ${dragIndex === i ? "opacity-40" : ""}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => drop(i)}
          >
            <span
              draggable
              aria-label={`${p.key} 순서 변경`}
              className="cursor-grab px-1 text-muted opacity-0 group-hover:opacity-100"
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "move";
                setDragIndex(i);
              }}
              onDragEnd={() => setDragIndex(null)}
            >
              <GripVertical size={14} />
            </span>
            <input
              key={p.key}
              aria-label="속성 이름"
              defaultValue={p.key}
              autoFocus={focusKey === p.key}
              onFocus={(e) => {
                if (focusKey !== p.key) return;
                e.currentTarget.select();
                setFocusKey(null);
              }}
              className={`${inputClass} ${keysOnly ? "flex-1" : "w-32 shrink-0 text-muted"}`}
              onKeyDown={(e) => commitKeys(e, p.key)}
              onBlur={(e) => renameKey(i, e.currentTarget)}
            />
            <input
              hidden={keysOnly}
              key={`${p.key}\u0000${p.value}`}
              aria-label={`${p.key} 값`}
              defaultValue={p.value}
              className={`${inputClass} flex-1`}
              onKeyDown={(e) => commitKeys(e, p.value)}
              onBlur={(e) => {
                if (e.currentTarget.value !== p.value)
                  patch(i, { ...p, value: e.currentTarget.value });
              }}
            />
            <button
              type="button"
              aria-label={`${p.key} 속성 삭제`}
              className="px-1 text-muted opacity-0 group-hover:opacity-100 hover:text-ink focus:opacity-100"
              onClick={() => onChange(props.filter((_, j) => j !== i))}
            >
              <X size={14} />
            </button>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="mt-1 text-caption text-error">
          {error}
        </p>
      )}
      <button
        type="button"
        className="mt-2 flex items-center gap-1 text-button text-muted hover:text-ink"
        onClick={() => {
          const key = newKey(props);
          setFocusKey(key);
          onChange([...props, { key, value: "" }]);
        }}
      >
        <Plus size={14} />
        {keysOnly ? "키 추가" : "속성 추가"}
      </button>
    </div>
  );
}
