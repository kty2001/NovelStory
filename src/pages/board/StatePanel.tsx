import { useCallback, useMemo, useRef, useState } from "react";
import { useStore, useViewport } from "@xyflow/react";
import { Plus, X } from "lucide-react";
import Button from "../../components/Button";
import { useDismiss } from "../../components/useDismiss";
import type { PropChange, StateItem } from "../../db/types";
import { addCharacter, updateState } from "../../store/boardActions";
import { useNovelStore } from "../../store/novelStore";
import type { Rect } from "./Leaders";
import { afterExit, categoryFamily, searchDocs, stateAt } from "./stateCalc";
import { STATE_CYCLE, STATE_LABEL } from "./tools";

const field =
  "min-w-0 rounded-xs border border-hairline bg-canvas px-2 py-1 text-body-sm text-ink placeholder:text-muted-soft focus:border-ink focus:outline-none";

// 한글 조합 중 Enter는 무시
const isComposing = (e: React.KeyboardEvent) => e.nativeEvent.isComposing || e.keyCode === 229;

// ① 캐릭터 선택 (B-3): 제목 · 별칭 부분 일치 검색, 없으면 새 캐릭터 문서 생성. 화면 좌표에 뜨는 팝오버
export function CharacterPicker({
  at,
  onPick,
  onCancel,
}: {
  at: { x: number; y: number };
  onPick: (docId: string) => void;
  onCancel: () => void;
}) {
  const docs = useNovelStore((s) => s.docs);
  const categories = useNovelStore((s) => s.categories);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, true, onCancel);

  const characters = useMemo(() => {
    const family = categoryFamily(categories, "character");
    return Object.values(docs)
      .filter((d) => family.has(d.categoryId))
      .sort((a, b) => a.title.localeCompare(b.title, "ko"));
  }, [docs, categories]);
  const found = searchDocs(characters, query);
  const name = query.trim();
  const exact = found.some((d) => d.title === name);

  const create = () => {
    const id = addCharacter(name);
    if (id) onPick(id);
  };

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="캐릭터 선택"
      className="fixed z-30 w-64 rounded-md border border-hairline bg-canvas p-2 shadow-float"
      style={{ left: at.x, top: at.y }}
    >
      <input
        autoFocus
        aria-label="캐릭터 검색"
        placeholder="캐릭터 이름 · 별칭"
        className={`${field} w-full`}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (isComposing(e) || e.key !== "Enter") return;
          if (found[0]) onPick(found[0].id);
          else if (name) create();
        }}
      />
      <ul className="mt-1 max-h-56 overflow-auto">
        {found.map((d) => (
          <li key={d.id}>
            <button
              type="button"
              className="w-full rounded-xs px-2 py-1.5 text-left text-body-sm text-ink hover:bg-surface-card"
              onClick={() => onPick(d.id)}
            >
              {d.title}
              {d.aliases.length > 0 && (
                <span className="ml-1 text-caption text-muted">{d.aliases.join(", ")}</span>
              )}
            </button>
          </li>
        ))}
        {name && !exact && (
          <li>
            <button
              type="button"
              className="flex w-full items-center gap-1 rounded-xs px-2 py-1.5 text-left text-body-sm text-ink hover:bg-surface-card"
              onClick={create}
            >
              <Plus size={14} />새 캐릭터 &lsquo;{name}&rsquo;
            </button>
          </li>
        )}
        {!name && !found.length && (
          <li className="px-2 py-1.5 text-caption text-muted">
            이름을 입력하면 새 캐릭터를 만들어요
          </li>
        )}
      </ul>
    </div>
  );
}

type Row = PropChange & { rowId: number };
let rowSeq = 0;
const toRows = (changes: PropChange[]): Row[] => changes.map((c) => ({ ...c, rowId: rowSeq++ }));

const PANEL_W = 320;
const GAP = 12;

// 블록 오른쪽(모자라면 왼쪽)에 띄우고 캔버스 아래로 넘치지 않게 보정. 미니맵 · 줌 컨트롤보다 위 레이어
function usePanelPosition(rect: Rect | undefined, height: number) {
  const { x: vx, y: vy, zoom } = useViewport();
  const width = useStore((s) => s.width);
  const canvasH = useStore((s) => s.height);
  if (!rect) return { left: 0, top: 0 };
  const right = (rect.x + rect.w) * zoom + vx + GAP;
  const left = right + PANEL_W > width ? rect.x * zoom + vx - GAP - PANEL_W : right;
  const top = Math.max(8, Math.min(rect.y * zoom + vy, canvasH - height - 8));
  return { left: Math.max(8, left), top };
}

// ②~⑤ 상태 입력 (B-3): 유형 탭 · 속성 변경 행(이전값 자동 채움) · 메모 · 관련 사건. 입력은 칸을 벗어날 때 저장
export default function StatePanel({
  itemId,
  rect,
  onClose,
}: {
  itemId: string;
  rect: Rect | undefined;
  onClose: () => void;
}) {
  const item = useNovelStore((s) => s.items[itemId]) as StateItem;
  const items = useNovelStore((s) => s.items);
  const docs = useNovelStore((s) => s.docs);
  const [rows, setRows] = useState<Row[]>(() => toRows(item.changes));
  const [height, setHeight] = useState(360);
  const pos = usePanelPosition(rect, height);

  const t = item.place.mode === "timed" ? item.place.t : null;
  // 이 블록 직전까지의 누적값 (미정 블록은 문서 속성만)
  const before = useMemo(
    () => stateAt(item.docId, t ?? -Infinity, items, docs, item.id),
    [item.docId, item.id, t, items, docs],
  );
  const keys = useMemo(
    () => [
      ...new Set([...(docs[item.docId]?.props.map((p) => p.key) ?? []), ...Object.keys(before)]),
    ],
    [docs, item.docId, before],
  );
  const events = Object.values(items).filter((i) => i.kind === "event");

  const commit = useCallback(
    (next: Row[]) => {
      const changes = next
        .filter((r) => r.key.trim() && r.to.trim())
        .map(({ key, from, to }) => ({
          key: key.trim(),
          to: to.trim(),
          ...(from ? { from } : {}),
        }));
      updateState(itemId, { changes });
    },
    [itemId],
  );
  const edit = (rowId: number, patch: Partial<PropChange>) =>
    setRows((rs) => rs.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r)));

  return (
    <div
      ref={(el) => {
        if (el && Math.abs(el.offsetHeight - height) > 1) setHeight(el.offsetHeight);
      }}
      role="dialog"
      aria-label="상태 입력"
      className="nodrag nowheel absolute z-20 rounded-md border border-hairline bg-canvas p-3 text-body-sm shadow-float"
      style={{ ...pos, width: PANEL_W }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <p className="mb-2 text-title-sm text-ink">{docs[item.docId]?.title}</p>
      <div role="tablist" className="mb-3 flex gap-0.5 rounded-sm bg-surface-card p-0.5">
        {STATE_CYCLE.map((type) => (
          <button
            key={type}
            type="button"
            role="tab"
            aria-selected={item.stateType === type}
            className={`flex-1 rounded-xs py-1 text-button ${item.stateType === type ? "bg-canvas text-ink shadow-sticky" : "text-muted"}`}
            onClick={() => updateState(itemId, { stateType: type })}
          >
            {STATE_LABEL[type]}
          </button>
        ))}
      </div>

      <p className="mb-1 text-caption text-muted">
        {item.stateType === "appear" ? "초기 속성값" : "속성 변경 (키: 이전값 → 새값)"}
      </p>
      <datalist id={`keys-${itemId}`}>
        {keys.map((k) => (
          <option key={k} value={k} />
        ))}
      </datalist>
      <ul className="flex flex-col gap-1">
        {rows.map((r, i) => (
          <li key={r.rowId} className="flex items-center gap-1">
            <input
              aria-label={`속성 ${i + 1} 키`}
              list={`keys-${itemId}`}
              placeholder="키"
              className={`${field} w-20`}
              value={r.key}
              onChange={(e) => edit(r.rowId, { key: e.target.value })}
              // 이전값 자동 채움 (수정 가능)
              onBlur={(e) => {
                const key = e.target.value.trim();
                const next = rows.map((x) =>
                  x.rowId === r.rowId && item.stateType !== "appear" && !x.from && before[key]
                    ? { ...x, from: before[key] }
                    : x,
                );
                setRows(next);
                commit(next);
              }}
            />
            {item.stateType !== "appear" && (
              <>
                <input
                  aria-label={`속성 ${i + 1} 이전값`}
                  placeholder="이전값"
                  className={`${field} w-20 italic`}
                  value={r.from ?? ""}
                  onChange={(e) => edit(r.rowId, { from: e.target.value })}
                  onBlur={() => commit(rows)}
                />
                <span className="text-muted">→</span>
              </>
            )}
            <input
              aria-label={`속성 ${i + 1} 새값`}
              placeholder="값"
              className={`${field} flex-1`}
              value={r.to}
              onChange={(e) => edit(r.rowId, { to: e.target.value })}
              onBlur={() => commit(rows)}
            />
            <button
              type="button"
              aria-label={`속성 ${i + 1} 삭제`}
              className="text-muted"
              onClick={() => {
                const next = rows.filter((x) => x.rowId !== r.rowId);
                setRows(next);
                commit(next);
              }}
            >
              <X size={14} />
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="mt-1 flex items-center gap-1 text-button text-ink"
        onClick={() => setRows((rs) => [...rs, { key: "", to: "", rowId: rowSeq++ }])}
      >
        <Plus size={14} />
        {item.stateType === "appear" ? "속성" : "속성 변경"}
      </button>

      <textarea
        aria-label="메모"
        placeholder={item.stateType === "exit" ? "퇴장 사유 (예: 상태: 생존 → 사망)" : "메모"}
        className={`${field} mt-3 h-16 w-full resize-none`}
        defaultValue={item.note}
        onBlur={(e) => {
          if (e.target.value !== item.note) updateState(itemId, { note: e.target.value });
        }}
      />

      <label className="mt-2 flex items-center gap-2 text-caption text-muted">
        관련 사건
        <select
          aria-label="관련 사건"
          className={`${field} flex-1`}
          value={item.linkedEventItemId ?? ""}
          onChange={(e) => updateState(itemId, { linkedEventItemId: e.target.value || undefined })}
        >
          <option value="">없음</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.kind === "event" ? docs[ev.docId]?.title : ""}
            </option>
          ))}
        </select>
      </label>

      {afterExit(item, items) && (
        <p role="note" className="mt-2 text-caption text-warning">
          ⚠ 이미 퇴장한 캐릭터예요. 부활 · 재등장이면 그대로 두세요.
        </p>
      )}
      <div className="mt-3 flex justify-end">
        <Button size="sm" variant="primary" onClick={onClose}>
          완료
        </Button>
      </div>
    </div>
  );
}
