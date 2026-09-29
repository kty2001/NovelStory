import { Plus } from "lucide-react";
import Button from "../../components/Button";
import type { ColorToken } from "../../db/types";
import { useNovelStore } from "../../store/novelStore";
import { addDoc, setCategoryColor } from "../../store/wikiActions";
import { subtreeDocs } from "./categories";
import { useWikiNav } from "./useWikiNav";

// 사용자 분류 색: 브랜드 색 + 기본 muted (ui_guide 사전 분류 색)
const CATEGORY_COLORS: { token: ColorToken; label: string }[] = [
  { token: "muted", label: "회색" },
  { token: "brand-mint", label: "민트" },
  { token: "brand-peach", label: "피치" },
  { token: "brand-teal", label: "틸" },
  { token: "brand-pink", label: "핑크" },
  { token: "brand-ochre", label: "오커" },
  { token: "brand-lavender", label: "라벤더" },
  { token: "brand-coral", label: "코랄" },
];

// 분류 화면 (최소): 머리(색 · 이름 · 문서 수 · 새 문서) + 문서 목록(하위 분류 포함)
export default function CategoryView({ categoryId }: { categoryId: string }) {
  const categories = useNovelStore((s) => s.categories);
  const docs = useNovelStore((s) => s.docs);
  const { openDoc } = useWikiNav();
  const category = categories[categoryId];
  if (!category) return null;
  const list = subtreeDocs(categories, docs, categoryId).sort((a, b) =>
    a.title.localeCompare(b.title, "ko"),
  );

  return (
    <section aria-label={`${category.name} 분류`}>
      <div className="flex items-center gap-3">
        <span
          className="size-3 rounded-full"
          style={{ background: `var(--color-${category.color})` }}
        />
        <h2 className="text-title-lg text-ink">{category.name}</h2>
        <span className="text-body-sm text-muted">문서 {list.length}</span>
        <Button
          variant="primary"
          size="sm"
          className="ml-auto"
          onClick={() => {
            const id = addDoc(categoryId);
            if (id) openDoc(id);
          }}
        >
          <Plus size={14} />새 문서
        </Button>
      </div>
      {!category.system && (
        <div role="group" aria-label="분류 색" className="mt-3 flex gap-2">
          {CATEGORY_COLORS.map((c) => (
            <button
              key={c.token}
              type="button"
              aria-label={c.label}
              aria-pressed={category.color === c.token}
              className={`size-5 rounded-full ${category.color === c.token ? "ring-2 ring-ink ring-offset-1" : ""}`}
              style={{ background: `var(--color-${c.token})` }}
              onClick={() => setCategoryColor(categoryId, c.token)}
            />
          ))}
        </div>
      )}
      <ul className="mt-6 border-t border-hairline">
        {list.map((d) => (
          <li key={d.id} className="border-b border-hairline">
            <button
              type="button"
              className="flex w-full items-center gap-3 px-2 py-3 text-left hover:bg-surface-soft"
              onClick={() => openDoc(d.id)}
            >
              <span className="text-body-md text-ink">{d.title || "제목 없음"}</span>
              {d.categoryId !== categoryId && (
                <span className="text-caption text-muted">{categories[d.categoryId]?.name}</span>
              )}
            </button>
          </li>
        ))}
      </ul>
      {list.length === 0 && <p className="mt-4 text-body-sm text-muted">문서 없음</p>}
    </section>
  );
}
