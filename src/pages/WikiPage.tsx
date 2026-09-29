import { useParams, useSearchParams } from "react-router";
import { useNovelStore } from "../store/novelStore";
import { categoryPath, childCategories } from "./wiki/categories";
import CategoryTree from "./wiki/CategoryTree";
import CategoryView from "./wiki/CategoryView";

// 사전: 좌측 분류 트리 240px + 우측 문서 영역 (최대 1280px 중앙)
export default function WikiPage() {
  const { docId } = useParams();
  const [params] = useSearchParams();
  const categories = useNovelStore((s) => s.categories);
  const docs = useNovelStore((s) => s.docs);
  const doc = docId ? docs[docId] : undefined;
  // 선택 분류: 열린 문서의 분류 > ?category= > 첫 최상위 분류 (onboarding 사전 첫 진입)
  const param = params.get("category");
  const categoryId =
    doc?.categoryId ?? (param && categories[param] ? param : childCategories(categories)[0]?.id);

  return (
    <div className="mx-auto flex h-full max-w-7xl">
      <CategoryTree categoryId={categoryId} docId={doc?.id} />
      <main className="min-w-0 flex-1 overflow-y-auto px-10 py-8">
        {doc ? (
          // 문서 편집은 F4 "문서 편집"에서
          <article>
            <p className="flex items-center gap-2 text-body-sm text-muted">
              {categoryPath(categories, doc.categoryId)
                .map((c) => c.name)
                .join(" › ")}
            </p>
            <h2 className="mt-2 text-display text-ink">{doc.title || "제목 없음"}</h2>
          </article>
        ) : (
          categoryId && <CategoryView categoryId={categoryId} />
        )}
      </main>
    </div>
  );
}
