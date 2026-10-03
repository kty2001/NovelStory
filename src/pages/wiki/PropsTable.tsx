import { useRef, useState, type KeyboardEvent } from "react";
import { GripVertical, Plus, Unlink, X } from "lucide-react";
import type { WikiProp } from "../../db/types";
import { propText } from "../../db/wikiDerived";
import { useNovelStore } from "../../store/novelStore";
import { mentionCandidates, type Candidate } from "./mention";
import { DocLinkChip } from "./MentionChip";

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
// 값을 `@`로 시작하면 문서 링크 후보 → 선택 시 값 전체가 링크 칩. keysOnly = 분류 템플릿 키 목록 (W-5, 값 칸 숨김)
export default function PropsTable({
  props,
  onChange,
  keysOnly = false,
  excludeId,
}: {
  props: WikiProp[];
  onChange: (props: WikiProp[]) => void;
  keysOnly?: boolean;
  excludeId?: string; // 링크 후보에서 뺄 문서 (현재 문서)
}) {
  const docs = useNovelStore((s) => s.docs);
  const categories = useNovelStore((s) => s.categories);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  // 링크 후보 목록: 입력 중인 행 · `@` 뒤 검색어 · 선택 위치
  const [link, setLink] = useState<{ row: number; query: string; active: number } | null>(null);
  const linkInput = useRef<HTMLInputElement | null>(null);
  const candidates = link ? mentionCandidates(docs, link.query, excludeId) : [];
  const active = link ? Math.min(link.active, Math.max(candidates.length - 1, 0)) : 0;

  const patch = (i: number, p: WikiProp) => onChange(props.map((x, j) => (j === i ? p : x)));

  // 선택: 입력칸 값을 원래대로 돌려 blur 커밋이 링크를 덮어쓰지 않게 함
  const pick = (i: number, c: Candidate) => {
    if (linkInput.current) linkInput.current.value = props[i].value;
    setLink(null);
    patch(i, { key: props[i].key, value: c.doc.title, docId: c.doc.id });
  };

  // 후보 목록이 열려 있을 때 키: ↑↓ 이동, Enter · Tab 선택, Esc 닫기. 처리했으면 true
  const linkKeys = (e: KeyboardEvent<HTMLInputElement>, i: number) => {
    if (link?.row !== i || e.nativeEvent.isComposing || e.keyCode === 229) return false;
    if (e.key === "Escape") {
      setLink(null);
      return true;
    }
    const n = candidates.length;
    if (!n) return false;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setLink({ ...link, active: (active + (e.key === "ArrowDown" ? 1 : n - 1)) % n });
      return true;
    }
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      pick(i, candidates[active]);
      return true;
    }
    return false;
  };

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
            {!keysOnly &&
              (p.docId ? (
                <span
                  aria-label={`${p.key} 값`}
                  className="min-w-0 flex-1 px-2 py-1.5 text-body-sm"
                >
                  <DocLinkChip id={p.docId} label={p.value} />
                </span>
              ) : (
                <div className="relative flex min-w-0 flex-1">
                  <input
                    key={`${p.key}\u0000${p.value}`}
                    aria-label={`${p.key} 값`}
                    defaultValue={p.value}
                    className={`${inputClass} flex-1`}
                    onChange={(e) => {
                      const v = e.currentTarget.value;
                      linkInput.current = e.currentTarget;
                      setLink(v.startsWith("@") ? { row: i, query: v.slice(1), active: 0 } : null);
                    }}
                    onKeyDown={(e) => linkKeys(e, i) || commitKeys(e, p.value)}
                    onBlur={(e) => {
                      setLink(null);
                      if (e.currentTarget.value !== p.value)
                        patch(i, { key: p.key, value: e.currentTarget.value });
                    }}
                  />
                  {link?.row === i && (
                    <ul
                      role="listbox"
                      aria-label="문서 링크 후보"
                      className="absolute top-full left-0 z-50 mt-1 max-w-80 min-w-60 rounded-md border border-hairline bg-canvas py-1 shadow-float"
                    >
                      {candidates.map((c, j) => {
                        const category = categories[c.doc.categoryId];
                        return (
                          <li
                            key={c.doc.id}
                            role="option"
                            aria-selected={j === active}
                            className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-body-sm text-ink ${j === active ? "bg-surface-card" : ""}`}
                            onMouseDown={(e) => {
                              e.preventDefault(); // 입력칸 포커스 유지
                              pick(i, c);
                            }}
                          >
                            <span
                              className="size-2 shrink-0 rounded-full"
                              style={{ background: `var(--color-${category?.color ?? "muted"})` }}
                            />
                            <span className="truncate">{c.doc.title}</span>
                            <span className="ml-auto shrink-0 pl-3 text-caption text-muted">
                              {c.alias ? `별칭 ${c.alias}` : (category?.name ?? "")}
                            </span>
                          </li>
                        );
                      })}
                      {!candidates.length && (
                        <li className="px-3 py-2 text-body-sm text-muted">
                          일치하는 문서가 없어요
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              ))}
            {p.docId && (
              <button
                type="button"
                aria-label={`${p.key} 링크 해제`}
                title="링크 해제"
                className="px-1 text-muted opacity-0 group-hover:opacity-100 hover:text-ink focus:opacity-100"
                onClick={() => patch(i, { key: p.key, value: propText(p, docs) })}
              >
                <Unlink size={14} />
              </button>
            )}
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
