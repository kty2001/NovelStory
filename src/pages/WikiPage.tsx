import { useState } from "react";
import { useLocation, useParams, useSearchParams } from "react-router";
import { useNovelStore } from "../store/novelStore";
import { childCategories } from "./wiki/categories";
import CategoryTree from "./wiki/CategoryTree";
import CategoryView from "./wiki/CategoryView";
import DocView from "./wiki/DocView";
import SearchResults from "./wiki/SearchResults";

// 사전: 좌측 분류 트리 240px + 우측 문서 영역 (최대 1280px 중앙)
export default function WikiPage() {
  const { docId } = useParams();
  const [params] = useSearchParams();
  const categories = useNovelStore((s) => s.categories);
  const docs = useNovelStore((s) => s.docs);
  const doc = docId ? docs[docId] : undefined;
  // 검색어는 입력한 화면에서만 유지: 문서 · 분류로 이동하면 트리 · 문서 화면으로 복귀
  const { key } = useLocation();
  const [search, setSearch] = useState({ query: "", key });
  const query = search.key === key ? search.query : "";
  // 선택 분류: 열린 문서의 분류 > ?category= > 첫 최상위 분류 (onboarding 사전 첫 진입)
  const param = params.get("category");
  const categoryId =
    doc?.categoryId ?? (param && categories[param] ? param : childCategories(categories)[0]?.id);

  return (
    <div className="mx-auto flex h-full max-w-7xl">
      <CategoryTree
        categoryId={categoryId}
        docId={doc?.id}
        query={query}
        onQuery={(q) => setSearch({ query: q, key })}
      />
      <main className="min-w-0 flex-1 overflow-y-auto px-10 py-8">
        {query.trim() ? (
          <SearchResults query={query} />
        ) : doc ? (
          <DocView key={doc.id} doc={doc} />
        ) : (
          categoryId && <CategoryView key={categoryId} categoryId={categoryId} />
        )}
      </main>
    </div>
  );
}
