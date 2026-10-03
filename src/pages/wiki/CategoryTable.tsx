import { useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import type { WikiDoc } from "../../db/types";
import { propText } from "../../db/wikiDerived";
import { setDocsLine, sortedLines } from "../../store/boardActions";
import { useNovelStore, type Collection } from "../../store/novelStore";
import { setPropValue } from "../../store/wikiActions";
import { stateAt, stateTicks } from "../board/stateCalc";
import { eventBlock, placeText, relatedCharacters } from "./boardLinks";
import { byTitle, familyOf, subtreeDocs } from "./categories";
import { DocLinkChip } from "./MentionChip";
import TimePick from "./TimePick";
import { useWikiNav } from "./useWikiNav";
import { isImeKey } from "../../lib/keys";

type Column = {
  id: string;
  label: string;
  sortKey: (d: WikiDoc) => string | number;
  cell: (d: WikiDoc, row: number) => ReactNode;
};

const propOf = (d: WikiDoc, key: string) => d.props.find((p) => p.key === key);
const valueOf = (d: WikiDoc, key: string, docs: Collection<WikiDoc>) => {
  const p = propOf(d, key);
  return p ? propText(p, docs) : "";
};

// 빈 값은 방향과 관계없이 뒤로
function compare(a: string | number, b: string | number, dir: 1 | -1) {
  if (a === "" || a === Infinity) return b === "" || b === Infinity ? 0 : 1;
  if (b === "" || b === Infinity) return -1;
  return (
    (typeof a === "number" && typeof b === "number"
      ? a - b
      : String(a).localeCompare(String(b), "ko")) * dir
  );
}

const th =
  "border-b border-hairline bg-surface-soft px-3 py-2 text-left text-caption font-semibold text-body whitespace-nowrap";
const td = "border-b border-hairline px-3 py-1.5 text-body-sm whitespace-nowrap";

// 표 보기 (W-3, UC-34): 문서 = 행, 속성 키 = 열, 셀 바로 수정, 열 머리 클릭 = 정렬.
// 첫 열(제목) 고정, 사건 계열은 라인 열 + 라인 순서 기본 정렬.
// 캐릭터 계열은 시점 선택 시 속성 열 = 그 시점 상태(읽기 전용, 기본값과 다르면 강조)
export default function CategoryTable({ categoryId }: { categoryId: string }) {
  const categories = useNovelStore((s) => s.categories);
  const docs = useNovelStore((s) => s.docs);
  const lines = sortedLines(useNovelStore((s) => s.lines));
  const items = useNovelStore((s) => s.items);
  const scale = useNovelStore((s) => s.board?.timeScale);
  const { openDoc } = useWikiNav();
  const category = categories[categoryId];
  const family = familyOf(categories, categoryId);
  const isEvent = family === "event";
  const [sort, setSort] = useState<{ id: string; dir: 1 | -1 }>({
    id: isEvent ? "line" : "title",
    dir: 1,
  });

  const [time, setTime] = useState<number | null>(null);

  const rows = subtreeDocs(categories, docs, categoryId);
  const ticks = family === "character" ? stateTicks(items, new Set(rows.map((d) => d.id))) : [];
  const t = time !== null && ticks.includes(time) ? time : null;
  const states =
    t === null ? null : Object.fromEntries(rows.map((d) => [d.id, stateAt(d.id, t, items, docs)]));
  // 속성 열: 템플릿 키 → 문서들에 쓰인 키 → 시점 상태가 더한 키 (처음 나온 순서)
  const keys = [
    ...new Set([
      ...category.templateProps,
      ...rows.flatMap((d) => d.props.map((p) => p.key)),
      ...Object.values(states ?? {}).flatMap(Object.keys),
    ]),
  ];
  const lineOrder = new Map(lines.map((l, i) => [l.id, i]));

  // Enter: 확정 후 아래 칸으로
  const focusCell = (from: Element, row: number, col: string) =>
    from
      .closest("table")
      ?.querySelector<HTMLInputElement>(`input[data-row="${row}"][data-col="${CSS.escape(col)}"]`)
      ?.focus();

  const propColumn = (key: string): Column => ({
    id: `prop:${key}`,
    label: key,
    sortKey: (d) => (states ? (states[d.id][key] ?? "") : valueOf(d, key, docs)),
    cell: (d, row) => {
      const value = valueOf(d, key, docs);
      const linked = propOf(d, key)?.docId;
      if (states) {
        const at = states[d.id][key] ?? "";
        return (
          <span
            aria-label={`${d.title} ${key}`}
            data-changed={at !== value || undefined}
            className="block rounded-xs px-1 py-0.5 text-ink data-changed:bg-sticky-yellow"
          >
            {at}
          </span>
        );
      }
      // 문서 링크 값은 칩 (수정은 문서 속성 표에서)
      if (linked) return <DocLinkChip id={linked} label={value} />;
      return (
        <input
          key={value}
          aria-label={`${d.title} ${key}`}
          data-row={row}
          data-col={key}
          defaultValue={value}
          className="w-full min-w-24 rounded-xs bg-transparent px-1 py-0.5 text-ink focus:bg-surface-soft focus:outline-none"
          onKeyDown={(e) => {
            if (isImeKey(e)) return;
            if (e.key === "Escape") {
              e.currentTarget.value = value;
              e.currentTarget.blur();
            }
            if (e.key === "Enter") {
              e.currentTarget.blur();
              focusCell(e.currentTarget, row + 1, key);
            }
          }}
          onBlur={(e) => {
            if (e.currentTarget.value !== value) setPropValue(d.id, key, e.currentTarget.value);
          }}
        />
      );
    },
  });

  const columns: Column[] = [
    {
      id: "title",
      label: "제목",
      sortKey: (d) => d.title,
      cell: (d) => (
        <button
          type="button"
          className="font-semibold text-ink hover:underline"
          onClick={() => openDoc(d.id)}
        >
          {d.title || "제목 없음"}
        </button>
      ),
    },
    ...(isEvent
      ? [
          {
            id: "line",
            label: "라인",
            sortKey: (d: WikiDoc) => (d.lineId ? (lineOrder.get(d.lineId) ?? Infinity) : Infinity),
            cell: (d: WikiDoc) => (
              <select
                aria-label={`${d.title} 라인`}
                value={d.lineId ?? ""}
                className="rounded-xs bg-transparent py-0.5 text-ink"
                onChange={(e) => setDocsLine([d.id], e.target.value || undefined)}
              >
                <option value="">미지정</option>
                {lines.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            ),
          },
        ]
      : []),
    // 보드에서 계산한 읽기 전용 열 (W-3 ⑥): 블록 없으면 "블록 없음", 미정 영역이면 "미정"
    ...(isEvent && scale
      ? [
          {
            id: "time",
            label: "작중 시점",
            sortKey: (d: WikiDoc) => {
              const p = eventBlock(items, d.id)?.place;
              return p?.mode === "timed" ? p.t : Infinity;
            },
            cell: (d: WikiDoc) => (
              <span className="text-body tabular-nums">
                {placeText(eventBlock(items, d.id)?.place, scale) ?? (
                  <span className="text-muted">블록 없음</span>
                )}
              </span>
            ),
          },
          {
            id: "chars",
            label: "관련 캐릭터",
            sortKey: (d: WikiDoc) =>
              relatedCharacters(items, docs, d.id)
                .map((c) => c.title)
                .join(", "),
            cell: (d: WikiDoc) => (
              <span className="text-body">
                {relatedCharacters(items, docs, d.id)
                  .map((c) => c.title)
                  .join(", ")}
              </span>
            ),
          },
        ]
      : []),
    {
      id: "tags",
      label: "태그",
      sortKey: (d) => d.tags.join(", "),
      cell: (d) => <span className="text-body">{d.tags.join(", ")}</span>,
    },
    ...keys.map(propColumn),
    ...(rows.some((d) => d.categoryId !== categoryId)
      ? [
          {
            id: "sub",
            label: "하위 분류",
            sortKey: (d: WikiDoc) =>
              d.categoryId === categoryId ? "" : (categories[d.categoryId]?.name ?? ""),
            cell: (d: WikiDoc) => (
              <span className="text-muted">
                {d.categoryId === categoryId ? "—" : categories[d.categoryId]?.name}
              </span>
            ),
          },
        ]
      : []),
  ];

  const col = columns.find((c) => c.id === sort.id) ?? columns[0];
  const sorted = [...rows].sort(
    (a, b) => compare(col.sortKey(a), col.sortKey(b), sort.dir) || byTitle(a, b),
  );

  return (
    <div>
      {ticks.length > 0 && (
        <div className="mb-3">
          <TimePick ticks={ticks} value={t} onChange={setTime} />
        </div>
      )}
      <div className="overflow-x-auto rounded-md border border-hairline">
        <table aria-label={`${category.name} 표`} className="w-full border-collapse">
          <thead>
            <tr>
              {columns.map((c, i) => (
                <th
                  key={c.id}
                  aria-sort={
                    sort.id === c.id ? (sort.dir === 1 ? "ascending" : "descending") : "none"
                  }
                  className={`${th} ${i === 0 ? "sticky left-0 z-[1]" : ""}`}
                >
                  <button
                    type="button"
                    className="flex items-center gap-1"
                    onClick={() =>
                      setSort((s) => ({
                        id: c.id,
                        dir: s.id === c.id ? (s.dir === 1 ? -1 : 1) : 1,
                      }))
                    }
                  >
                    {c.label}
                    {sort.id === c.id &&
                      (sort.dir === 1 ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((d, row) => (
              <tr key={d.id} data-testid="table-row">
                {columns.map((c, i) => (
                  <td
                    key={c.id}
                    className={`${td} ${i === 0 ? "sticky left-0 z-[1] bg-canvas" : ""}`}
                  >
                    {c.cell(d, row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-caption text-muted">
        {states
          ? "시점 상태는 읽기 전용 · 열 머리를 눌러 정렬"
          : "셀을 눌러 바로 수정 · 열 머리를 눌러 정렬"}
      </p>
    </div>
  );
}
