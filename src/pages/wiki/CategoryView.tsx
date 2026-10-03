import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Plus } from "lucide-react";
import Button from "../../components/Button";
import EmptyState from "../../components/EmptyState";
import type { WikiCategory } from "../../db/types";
import { useNovelStore } from "../../store/novelStore";
import { addDoc } from "../../store/wikiActions";
import { byTitle, familyOf, subtreeDocs } from "./categories";
import CategorySettings from "./CategorySettings";
import CategoryTable from "./CategoryTable";
import { useWikiNav } from "./useWikiNav";

const TABS = { list: "문서 목록", table: "표", settings: "설정" } as const;

// 빈 분류 안내 (W-7, onboarding 2장): 캐릭터 · 사건 계열은 보드 자동 생성 안내 + 보드로 가기, 그 외 템플릿 안내
function EmptyCategory({ category, onCreate }: { category: WikiCategory; onCreate: () => void }) {
  const categories = useNovelStore((s) => s.categories);
  const { novelId } = useParams();
  const navigate = useNavigate();
  const family = familyOf(categories, category.id);
  const keys = category.templateProps.join(" · ");
  const block = family === "character" ? "캐릭터 상태" : family === "event" ? "사건" : null;
  return (
    <EmptyState
      boxed
      title={`아직 ${category.name} 문서가 없어요`}
      actions={
        <>
          <Button variant="primary" onClick={onCreate}>
            <Plus size={16} />새 {category.name} 문서
          </Button>
          {block && (
            <Button onClick={() => navigate(`/novel/${novelId}/board`)}>보드로 가기</Button>
          )}
        </>
      }
    >
      {block && (
        <>
          보드에 {block} 블록을 놓으면 {category.name} 문서가 자동으로 생겨요.
          <br />
        </>
      )}
      {keys
        ? `${block ? "직접 만들면" : "새 문서는"} 템플릿 속성(${keys})이 채워진 채로 시작해요.`
        : !block && "설정 탭에서 템플릿 속성을 정하면 새 문서에 빈 값으로 채워져요."}
    </EmptyState>
  );
}

// 분류 화면: 머리(색 · 이름 · 문서 수 · 새 문서) + 탭(문서 목록(하위 분류 포함) · 표 · 설정)
export default function CategoryView({ categoryId }: { categoryId: string }) {
  const categories = useNovelStore((s) => s.categories);
  const docs = useNovelStore((s) => s.docs);
  const { openDoc } = useWikiNav();
  const create = () => {
    const id = addDoc(categoryId);
    if (id) openDoc(id);
  };
  const [tab, setTab] = useState<keyof typeof TABS>("list");
  const category = categories[categoryId];
  if (!category) return null;
  const list = subtreeDocs(categories, docs, categoryId).sort(byTitle);

  return (
    <section aria-label={`${category.name} 분류`}>
      <div className="flex items-center gap-3">
        <span
          className="size-3 rounded-full"
          style={{ background: `var(--color-${category.color})` }}
        />
        <h2 className="text-title-lg text-ink">{category.name}</h2>
        <span className="text-body-sm text-muted">문서 {list.length}</span>
        <Button variant="primary" size="sm" className="ml-auto" onClick={create}>
          <Plus size={14} />새 문서
        </Button>
      </div>
      <div role="tablist" className="mt-4 flex gap-1">
        {Object.entries(TABS).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={`rounded-full px-4 py-1.5 text-button ${tab === key ? "bg-surface-card text-ink" : "text-muted"}`}
            onClick={() => setTab(key as keyof typeof TABS)}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "settings" ? (
        <div className="mt-6">
          <CategorySettings category={category} />
        </div>
      ) : list.length === 0 ? (
        <EmptyCategory category={category} onCreate={create} />
      ) : tab === "table" ? (
        <div className="mt-6">
          <CategoryTable categoryId={categoryId} />
        </div>
      ) : (
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
      )}
    </section>
  );
}
