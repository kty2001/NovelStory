import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { Clock } from "lucide-react";
import Dialog from "../components/Dialog";
import EmptyState from "../components/EmptyState";
import { useNovelStore } from "../store/novelStore";
import { searchDocs } from "./board/stateCalc";

type Result =
  | { kind: "doc"; id: string; title: string; sub: string; color: string }
  | { kind: "tick"; t: number; title: string; sub: string };

const LIMIT = 8;

// 빠른 이동 (B-8, Ctrl+K): 사전 문서(제목 · 별칭) + 시간축 시점(눈금 번호 · 라벨) 검색
export default function QuickMove({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="빠른 이동" className="!p-4">
      {open && <Palette onClose={onClose} />}
    </Dialog>
  );
}

function Palette({ onClose }: { onClose: () => void }) {
  const { novelId } = useParams();
  const navigate = useNavigate();
  const onBoard = useLocation().pathname.endsWith("/board");
  const docs = useNovelStore((s) => s.docs);
  const categories = useNovelStore((s) => s.categories);
  const labels = useNovelStore((s) => s.board?.timeScale.tickLabels ?? {});
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const q = query.trim();
  const results: Result[] = [];
  if (q) {
    for (const d of searchDocs(Object.values(docs), q)
      .sort((a, b) => a.title.localeCompare(b.title, "ko"))
      .slice(0, LIMIT)) {
      const c = categories[d.categoryId];
      results.push({
        kind: "doc",
        id: d.id,
        title: d.title,
        sub: c?.name ?? "",
        color: c?.color ?? "muted",
      });
    }
    // 숫자 = 그 눈금 먼저, 이어서 라벨 일치 눈금
    const exact = /^\d+$/.test(q) ? [Number(q)] : [];
    const byLabel = Object.entries(labels)
      .filter(([t, label]) => label.toLowerCase().includes(q.toLowerCase()) && !exact.includes(+t))
      .map(([t]) => Number(t))
      .sort((a, b) => a - b);
    for (const t of [...exact, ...byLabel].slice(0, LIMIT))
      results.push({ kind: "tick", t, title: labels[t] || `눈금 ${t}`, sub: `시점 ${t}` });
  }
  const at = Math.min(active, Math.max(results.length - 1, 0));

  const go = (r: Result | undefined) => {
    if (!r) return;
    onClose();
    // 문서: 보드에서는 사전 패널, 사전에서는 문서 화면
    if (r.kind === "doc")
      navigate(onBoard ? `/novel/${novelId}/board?doc=${r.id}` : `/novel/${novelId}/wiki/${r.id}`);
    else navigate(`/novel/${novelId}/board?tick=${r.t}`);
  };

  return (
    <div>
      <input
        autoFocus
        aria-label="빠른 이동 검색"
        placeholder="문서 제목 · 별칭, 눈금 번호 · 라벨"
        value={query}
        className="w-full rounded-sm border border-hairline bg-canvas px-3 py-2 text-body-sm text-ink focus:border-ink focus:outline-none"
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
        }}
        onKeyDown={(e) => {
          if (e.nativeEvent.isComposing || e.keyCode === 229) return;
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            const n = results.length || 1;
            setActive((at + (e.key === "ArrowDown" ? 1 : n - 1)) % n);
          }
          if (e.key === "Enter") go(results[at]);
        }}
      />
      <ul role="listbox" aria-label="빠른 이동 결과" className="mt-2 max-h-80 overflow-y-auto">
        {results.map((r, i) => (
          <li
            key={r.kind === "doc" ? r.id : `t${r.t}`}
            role="option"
            aria-selected={i === at}
            className={`flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-body-sm text-ink ${i === at ? "bg-surface-card" : ""}`}
            onMouseEnter={() => setActive(i)}
            onClick={() => go(r)}
          >
            {r.kind === "doc" ? (
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ background: `var(--color-${r.color})` }}
              />
            ) : (
              <Clock size={12} className="shrink-0 text-muted" />
            )}
            <span className="truncate">{r.title}</span>
            <span className="ml-auto shrink-0 text-caption text-muted">{r.sub}</span>
          </li>
        ))}
      </ul>
      {q && results.length === 0 && (
        <div className="px-3">
          <EmptyState title="일치하는 문서 · 시점이 없어요">
            숫자를 입력하면 그 눈금 번호로 이동해요
          </EmptyState>
        </div>
      )}
    </div>
  );
}
