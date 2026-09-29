import { useCallback, useRef, useState, type DragEvent } from "react";
import { ChevronDown, ChevronRight, Lock, MoreHorizontal, Plus } from "lucide-react";
import Button from "../../components/Button";
import { MenuList, type MenuItem } from "../../components/Menu";
import Toast from "../../components/Toast";
import { useDismiss } from "../../components/useDismiss";
import type { WikiCategory } from "../../db/types";
import { useNovelStore } from "../../store/novelStore";
import {
  addCategory,
  addDoc,
  deleteCategory,
  moveCategory,
  renameCategory,
} from "../../store/wikiActions";
import {
  categoryPath,
  childCategories,
  deleteError,
  docCounts,
  dropError,
  type DropPos,
} from "./categories";
import { useWikiNav } from "./useWikiNav";

const INDENT = 16;

// 행 높이 위 25% = 앞, 아래 25% = 뒤, 가운데 = 하위로
const posAt = (e: DragEvent<HTMLElement>): DropPos => {
  const r = e.currentTarget.getBoundingClientRect();
  const y = (e.clientY - r.top) / r.height;
  return y < 0.25 ? "before" : y > 0.75 ? "after" : "inside";
};

const DROP_MARK: Record<DropPos, string> = {
  before: "shadow-[inset_0_2px_0_var(--color-ink)]",
  after: "shadow-[inset_0_-2px_0_var(--color-ink)]",
  inside: "outline-dashed outline-1 -outline-offset-1 outline-ink",
};

// 분류 이름 입력 (Enter · 바깥 클릭 = 확정, Esc = 취소, 한글 조합 중 Enter 무시)
function NameInput({ initial, onDone }: { initial: string; onDone: (name: string) => void }) {
  const cancelled = useRef(false);
  return (
    <input
      aria-label="분류 이름"
      defaultValue={initial}
      autoFocus
      onFocus={(e) => e.currentTarget.select()}
      className="min-w-0 flex-1 rounded-xs border border-ink bg-canvas px-1 text-body-sm text-ink focus:outline-none"
      onKeyDown={(e) => {
        if (e.nativeEvent.isComposing || e.keyCode === 229) return;
        if (e.key === "Escape") cancelled.current = true;
        if (e.key === "Enter" || e.key === "Escape") e.currentTarget.blur();
      }}
      onBlur={(e) => {
        const name = e.currentTarget.value.trim();
        onDone(cancelled.current || !name ? initial : name);
      }}
    />
  );
}

// 사전 분류 트리 (W-1 · W-5): 분류 · 하위 분류 · 문서, 분류 메뉴, 끌어서 순서 · 위치 변경 (UC-30)
export default function CategoryTree({
  categoryId,
  docId,
}: {
  categoryId?: string; // 선택 분류 (문서를 열었으면 그 문서의 분류)
  docId?: string;
}) {
  const categories = useNovelStore((s) => s.categories);
  const docs = useNovelStore((s) => s.docs);
  const items = useNovelStore((s) => s.items);
  const { openCategory, openDoc } = useWikiNav();
  const counts = docCounts(categories, docs);

  // 펼침: 직접 누른 상태 우선, 없으면 선택 항목의 상위 분류만 펼침
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const path = categoryId ? categoryPath(categories, categoryId) : [];
  const autoOpen = new Set((docId ? path : path.slice(0, -1)).map((c) => c.id));
  const isOpen = (id: string) => toggled[id] ?? autoOpen.has(id);
  const expand = (id: string) => setToggled((t) => ({ ...t, [id]: true }));

  const [editingId, setEditingId] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeMenu = useCallback(() => setMenu(null), []);
  useDismiss(menuRef, !!menu, closeMenu);

  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<{ id: string; pos: DropPos; error: string | null } | null>(null);
  const endDrag = () => {
    setDragId(null);
    setOver(null);
  };

  const create = (parentId?: string) => {
    const id = addCategory(parentId);
    if (!id) return;
    if (parentId) expand(parentId);
    setEditingId(id);
  };

  const menuItems = (c: WikiCategory): MenuItem[] => {
    const reason = deleteError(categories, docs, c.id);
    return [
      { label: "이름 변경", onSelect: () => setEditingId(c.id) },
      { label: "하위 분류 만들기", onSelect: () => create(c.id) },
      {
        label: "삭제",
        danger: true,
        disabled: !!reason,
        hint: reason ?? undefined,
        onSelect: () => deleteCategory(c.id),
      },
    ];
  };

  const dragOver = (e: DragEvent<HTMLElement>, id: string) => {
    if (!dragId) return;
    const pos = posAt(e);
    const error = id === dragId ? "" : dropError({ categories, docs, items }, dragId, id, pos);
    if (error === null) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    }
    if (over?.id !== id || over.pos !== pos || over.error !== error) setOver({ id, pos, error });
  };

  const drop = (e: DragEvent<HTMLElement>, id: string) => {
    e.preventDefault();
    if (dragId && over?.id === id && !moveCategory(dragId, id, over.pos) && over.pos === "inside")
      expand(id);
    endDrag();
  };

  const renderCategory = (c: WikiCategory, depth: number) => {
    const children = childCategories(categories, c.id);
    const childDocs = Object.values(docs)
      .filter((d) => d.categoryId === c.id)
      .sort((a, b) => a.title.localeCompare(b.title, "ko"));
    const open = isOpen(c.id);
    const selected = !docId && categoryId === c.id;
    const mark = over?.id === c.id && over.error === null ? DROP_MARK[over.pos] : "";
    return (
      <li key={c.id}>
        <div
          data-testid="category-row"
          data-depth={depth}
          draggable={!c.system && editingId !== c.id}
          className={`group flex h-8 items-center gap-1 rounded-sm pr-1 ${selected ? "bg-surface-card" : "hover:bg-surface-soft"} ${dragId === c.id ? "opacity-40" : ""} ${mark} ${c.system ? "" : "cursor-grab"}`}
          style={{ paddingLeft: 4 + depth * INDENT }}
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", c.id);
            setDragId(c.id);
          }}
          onDragEnd={endDrag}
          onDragOver={(e) => dragOver(e, c.id)}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(null);
          }}
          onDrop={(e) => drop(e, c.id)}
          onContextMenu={(e) => {
            e.preventDefault();
            setMenu({ id: c.id, x: e.clientX, y: e.clientY });
          }}
        >
          <button
            type="button"
            aria-label={`${c.name} ${open ? "접기" : "펼치기"}`}
            aria-expanded={open}
            className={`flex size-5 shrink-0 items-center justify-center text-muted ${children.length || childDocs.length ? "" : "invisible"}`}
            onClick={() => setToggled((t) => ({ ...t, [c.id]: !open }))}
          >
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ background: `var(--color-${c.color})` }}
          />
          {editingId === c.id ? (
            <NameInput
              initial={c.name}
              onDone={(name) => {
                if (name !== c.name) renameCategory(c.id, name);
                setEditingId(null);
              }}
            />
          ) : (
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-1 text-left text-body-sm text-ink"
              onClick={() => openCategory(c.id)}
              onDoubleClick={() => setEditingId(c.id)}
            >
              <span className="truncate">{c.name}</span>
              {c.system && (
                <Lock size={12} aria-label="기본 분류" className="shrink-0 text-muted" />
              )}
            </button>
          )}
          <span className="text-caption text-muted tabular-nums group-hover:hidden">
            {counts[c.id] ?? 0}
          </span>
          <button
            type="button"
            aria-label={`${c.name} 메뉴`}
            className="hidden size-6 items-center justify-center rounded-xs text-muted group-hover:flex hover:bg-surface-strong"
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setMenu({ id: c.id, x: r.left, y: r.bottom + 4 });
            }}
          >
            <MoreHorizontal size={14} />
          </button>
        </div>
        {open && (
          <ul>
            {children.map((child) => renderCategory(child, depth + 1))}
            {childDocs.map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  data-testid="doc-row"
                  className={`flex h-8 w-full items-center truncate rounded-sm pr-2 text-left text-body-sm text-body ${docId === d.id ? "bg-surface-card text-ink" : "hover:bg-surface-soft"}`}
                  style={{ paddingLeft: 4 + (depth + 1) * INDENT + 20 }}
                  onClick={() => openDoc(d.id)}
                >
                  {d.title || "제목 없음"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </li>
    );
  };

  const menuCategory = menu && categories[menu.id];

  return (
    <aside className="flex w-60 shrink-0 flex-col gap-3 overflow-y-auto border-r border-hairline p-3">
      <div className="flex gap-2">
        <Button
          variant="primary"
          size="sm"
          className="flex-1"
          disabled={!categoryId}
          onClick={() => {
            const id = categoryId && addDoc(categoryId);
            if (id) openDoc(id);
          }}
        >
          <Plus size={14} />새 문서
        </Button>
        <Button size="sm" onClick={() => create()}>
          <Plus size={14} />
          분류
        </Button>
      </div>
      <ul aria-label="분류 트리">{childCategories(categories).map((c) => renderCategory(c, 0))}</ul>
      {menuCategory && (
        <div ref={menuRef} className="fixed z-20" style={{ left: menu.x, top: menu.y }}>
          <MenuList items={menuItems(menuCategory)} onClose={closeMenu} />
        </div>
      )}
      {dragId && over?.error && <Toast>{over.error}</Toast>}
    </aside>
  );
}
