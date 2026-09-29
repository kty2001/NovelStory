import { deleteImage } from "../db/images";
import type { ColorToken, TiptapJSON, WikiCategory, WikiDoc } from "../db/types";
import { deriveDoc } from "../db/wikiDerived";
import {
  blockCount,
  childCategories,
  deleteError,
  dropError,
  familyOf,
  movedCategories,
  subtreeDocs,
  usedDocIds,
  type DropPos,
} from "../pages/wiki/categories";
import { newDoc, setDocsLine } from "./boardActions";
import { useNovelStore } from "./novelStore";

// 사전 분류 · 문서 동작 (UC-30 · 31). 실행 취소 기록 대상 아님

const store = useNovelStore;

// 새 분류: 형제 중 마지막. 최상위 = muted, 하위 = 상위 분류 색 (ui_guide)
export function addCategory(parentId?: string): string | null {
  const { novelId, categories } = store.getState();
  if (!novelId) return null;
  const siblings = childCategories(categories, parentId);
  const category: WikiCategory = {
    id: crypto.randomUUID(),
    novelId,
    updatedAt: new Date().toISOString(),
    name: "새 분류",
    order: (siblings.at(-1)?.order ?? -1) + 1,
    templateProps: [],
    color: parentId ? (categories[parentId]?.color ?? "muted") : "muted",
    ...(parentId && { parentId }),
  };
  store.setState({ categories: { ...categories, [category.id]: category } });
  return category.id;
}

export function renameCategory(id: string, name: string) {
  store.setState(({ categories }) =>
    categories[id] ? { categories: { ...categories, [id]: { ...categories[id], name } } } : {},
  );
}

// 색은 사용자 분류만 (기본 분류 색은 보드 블록 색과 일치)
export function setCategoryColor(id: string, color: ColorToken) {
  store.setState(({ categories }) =>
    categories[id] && !categories[id].system
      ? { categories: { ...categories, [id]: { ...categories[id], color } } }
      : {},
  );
}

// 템플릿 키 (UC-32). 새 문서에만 적용, 기존 문서는 그대로
export function setTemplateProps(id: string, templateProps: string[]) {
  store.setState(({ categories }) =>
    categories[id]
      ? { categories: { ...categories, [id]: { ...categories[id], templateProps } } }
      : {},
  );
}

export function deleteCategory(id: string) {
  const { categories, docs } = store.getState();
  if (!categories[id] || deleteError(categories, docs, id)) return;
  const { [id]: _removed, ...rest } = categories;
  store.setState({ categories: rest });
}

// 끌어 놓기. 불가 이유가 있으면 이동하지 않고 이유 반환.
// 사건 계열을 벗어나면 하위 문서의 라인 제거 (data_model 5장)
export function moveCategory(dragId: string, targetId: string, pos: DropPos): string | null {
  const s = store.getState();
  const error = dropError(s, dragId, targetId, pos);
  if (error) return error;
  const next = movedCategories(s.categories, dragId, targetId, pos);
  store.setState({ categories: next });
  if (familyOf(s.categories, dragId) === "event" && familyOf(next, dragId) !== "event")
    setDocsLine(
      subtreeDocs(next, s.docs, dragId).map((d) => d.id),
      undefined,
    );
  return null;
}

// 분류에 새 문서 (템플릿 속성 빈 값, UC-31). 문서 ID 반환
export function addDoc(categoryId: string): string | null {
  const { novelId, categories, docs } = store.getState();
  const category = categories[categoryId];
  if (!novelId || !category) return null;
  const doc = newDoc(novelId, category, "새 문서");
  store.setState({ docs: { ...docs, [doc.id]: doc } });
  return doc.id;
}

type DocPatch = Partial<Pick<WikiDoc, "aliases" | "tags" | "props" | "imageId">>;

// 문서 필드 변경. imageId: undefined = 대표 이미지 제거
export function updateDoc(id: string, patch: DocPatch) {
  store.setState(({ docs }) => {
    if (!docs[id]) return {};
    const next = { ...docs[id], ...patch };
    if ("imageId" in patch && !patch.imageId) delete next.imageId;
    return { docs: { ...docs, [id]: next } };
  });
}

// 속성 값 하나 변경 (표 셀 수정, UC-34). 없는 키면 끝에 추가
export function setPropValue(id: string, key: string, value: string) {
  const doc = store.getState().docs[id];
  if (!doc) return;
  const has = doc.props.some((p) => p.key === key);
  updateDoc(id, {
    props: has
      ? doc.props.map((p) => (p.key === key ? { key, value } : p))
      : [...doc.props, { key, value }],
  });
}

// 본문 변경: 파생 필드(mentions · plainText) 함께 계산 (data_model 4.5)
export function setDocBody(id: string, body: TiptapJSON | null) {
  store.setState(({ docs }) =>
    docs[id] ? { docs: { ...docs, [id]: { ...docs[id], body, ...deriveDoc(body) } } } : {},
  );
}

// 분류 이동. 보드에 쓰인 문서는 같은 계열 안에서만, 사건 계열 밖이면 라인 제거 (data_model 5장)
export function moveDoc(id: string, categoryId: string): string | null {
  const { docs, categories, items } = store.getState();
  const doc = docs[id];
  if (!doc || !categories[categoryId] || doc.categoryId === categoryId) return null;
  const to = familyOf(categories, categoryId);
  if (familyOf(categories, doc.categoryId) !== to && usedDocIds(items).has(id))
    return "보드에 쓰인 문서는 같은 계열 안에서만 옮길 수 있어요";
  const { lineId: _line, ...rest } = doc;
  store.setState({ docs: { ...docs, [id]: { ...(to === "event" ? doc : rest), categoryId } } });
  return null;
}

// 문서 삭제 (보드 블록이 없는 문서만) + 대표 이미지 삭제
export function deleteDoc(id: string) {
  const { docs, items } = store.getState();
  const doc = docs[id];
  if (!doc || blockCount(items, id)) return;
  const { [id]: _removed, ...rest } = docs;
  store.setState({ docs: rest });
  if (doc.imageId) void deleteImage(doc.imageId);
}
