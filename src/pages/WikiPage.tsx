import { useState } from "react";
import { useParams, useSearchParams } from "react-router";
import { useNovelStore } from "../store/novelStore";
import { childCategories } from "./wiki/categories";
import CategoryTree from "./wiki/CategoryTree";
import CategoryView from "./wiki/CategoryView";
import CheckView from "./wiki/CheckView";
import DocView from "./wiki/DocView";
import SearchResults from "./wiki/SearchResults";

// 사전: 좌측 분류 트리 240px + 우측 문서 영역 (최대 1280px 중앙)
export default function WikiPage() {
  const { docId } = useParams();
  const [params] = useSearchParams();
  const categories = useNovelStore((s) => s.categories);
  const docs = useNovelStore((s) => s.docs);
  const doc = docId ? docs[docId] : undefined;
  // 검색어: 트리에서 분류 · 문서를 누르거나 연 문서가 바뀌면(검색 결과 · 빠른 이동) 비움.
  // 위치 키로 판단하지 않는 이유: 라우터 이동이 transition이라 막 누른 직후 입력이 지워질 수 있음
  const [query, setQuery] = useState("");
  const [openedDoc, setOpenedDoc] = useState(docId);
  if (openedDoc !== docId) {
    setOpenedDoc(docId);
    setQuery("");
  }
  // 선택 분류: 열린 문서의 분류 > ?category= > 첫 최상위 분류 (onboarding 사전 첫 진입). 설정 점검 중엔 없음
  const checking = !doc && params.get("view") === "check";
  const param = params.get("category");
  const categoryId =
    doc?.categoryId ??
    (checking
      ? undefined
      : param && categories[param]
        ? param
        : childCategories(categories)[0]?.id);

  return (
    <div className="mx-auto flex h-full max-w-7xl">
      <CategoryTree
        categoryId={categoryId}
        docId={doc?.id}
        checking={checking}
        query={query}
        onQuery={setQuery}
      />
      <main className="min-w-0 flex-1 overflow-y-auto px-10 py-8">
        {query.trim() ? (
          <SearchResults query={query} categoryId={categoryId} onClear={() => setQuery("")} />
        ) : doc ? (
          <DocView key={doc.id} doc={doc} />
        ) : checking ? (
          <CheckView />
        ) : (
          categoryId && <CategoryView key={categoryId} categoryId={categoryId} />
        )}
      </main>
    </div>
  );
}
