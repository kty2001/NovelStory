import type { SuggestionKeyDownProps, SuggestionProps } from "@tiptap/suggestion";
import type { WikiDoc } from "../../db/types";
import { useNovelStore, type Collection } from "../../store/novelStore";
import { searchDocs } from "../board/stateCalc";

// 본문 `@` 링크 후보 (UC-33, shortcuts 3.2)

export type Candidate = { doc: WikiDoc; alias?: string };
type MentionAttrs = { id: string; label: string };

const LIMIT = 8;

// 제목 · 별칭 부분 일치, 현재 문서 제외. 제목 앞부분 일치 우선 → 가나다. alias = 별칭으로만 찾은 경우
export function mentionCandidates(
  docs: Collection<WikiDoc>,
  query: string,
  excludeId: string,
): Candidate[] {
  const q = query.trim().toLowerCase();
  const rank = (d: WikiDoc) => (d.title.toLowerCase().startsWith(q) ? 0 : 1);
  return searchDocs(
    Object.values(docs).filter((d) => d.id !== excludeId),
    query,
  )
    .sort((a, b) => rank(a) - rank(b) || a.title.localeCompare(b.title, "ko"))
    .slice(0, LIMIT)
    .map((doc) => ({
      doc,
      alias:
        q && !doc.title.toLowerCase().includes(q)
          ? doc.aliases.find((a) => a.toLowerCase().includes(q))
          : undefined,
    }));
}

const span = (className: string, text = "") => {
  const el = document.createElement("span");
  el.className = className;
  el.textContent = text;
  return el;
};

// 후보 목록 팝업 (스파이크 C1 바닐라 DOM 이식). 조합 중 키는 IME에 맡김
export function suggestionRenderer() {
  let el: HTMLUListElement | null = null;
  let props: SuggestionProps<Candidate, MentionAttrs> | null = null;
  let active = 0;

  const select = (c: Candidate | undefined) => {
    if (c) props?.command({ id: c.doc.id, label: c.doc.title });
  };

  const draw = () => {
    if (!el || !props) return;
    const { categories } = useNovelStore.getState();
    const rows = props.items.map((c, i) => {
      const li = document.createElement("li");
      li.role = "option";
      li.ariaSelected = String(i === active);
      li.className = `flex cursor-pointer items-center gap-2 px-3 py-2 text-body-sm text-ink ${i === active ? "bg-surface-card" : ""}`;
      const dot = span("size-2 shrink-0 rounded-full");
      dot.style.background = `var(--color-${categories[c.doc.categoryId]?.color ?? "muted"})`;
      li.append(
        dot,
        span("truncate", c.doc.title),
        span(
          "ml-auto shrink-0 pl-3 text-caption text-muted",
          c.alias ? `별칭 ${c.alias}` : (categories[c.doc.categoryId]?.name ?? ""),
        ),
      );
      li.onmousedown = (e) => {
        e.preventDefault(); // 본문 포커스 유지
        select(c);
      };
      return li;
    });
    el.replaceChildren(
      ...(rows.length
        ? rows
        : [span("block px-3 py-2 text-body-sm text-muted", "일치하는 문서가 없어요")]),
    );
    const rect = props.clientRect?.();
    if (rect) {
      el.style.left = `${rect.left}px`;
      el.style.top = `${rect.bottom + 4}px`;
    }
  };

  return {
    onStart: (p: SuggestionProps<Candidate, MentionAttrs>) => {
      props = p;
      active = 0;
      el = document.createElement("ul");
      el.role = "listbox";
      el.ariaLabel = "문서 링크 후보";
      el.className =
        "fixed z-50 max-w-80 min-w-60 rounded-md border border-hairline bg-canvas py-1 shadow-float";
      document.body.appendChild(el);
      draw();
    },
    onUpdate: (p: SuggestionProps<Candidate, MentionAttrs>) => {
      props = p;
      active = Math.min(active, Math.max(p.items.length - 1, 0));
      draw();
    },
    onKeyDown: ({ event }: SuggestionKeyDownProps) => {
      if (!props || event.isComposing || event.keyCode === 229) return false;
      const n = props.items.length;
      if (!n) return false;
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        active = (active + (event.key === "ArrowDown" ? 1 : n - 1)) % n;
        draw();
        return true;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        select(props.items[active]);
        return true;
      }
      return false;
    },
    onExit: () => {
      el?.remove();
      el = null;
      props = null;
    },
  };
}
