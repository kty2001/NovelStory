import type { ReactNode } from "react";
import { Info, Lock } from "lucide-react";
import type { ColorToken, WikiCategory } from "../../db/types";
import { useNovelStore } from "../../store/novelStore";
import {
  moveCategory,
  renameCategory,
  setCategoryColor,
  setTemplateProps,
} from "../../store/wikiActions";
import { childCategories, dropError, flatCategories } from "./categories";
import PropsTable from "./PropsTable";

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

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex flex-col gap-1.5">
    <span className="text-caption text-muted">{label}</span>
    {children}
  </div>
);

const fieldClass =
  "w-full rounded-sm border border-hairline bg-canvas px-3 py-2 text-body-sm text-ink focus:border-ink focus:outline-none disabled:bg-surface-soft disabled:text-muted";

// 분류 설정 탭 (W-5): 이름 · 상위 분류 · 색 · 템플릿 키 (UC-30 · 32)
export default function CategorySettings({ category }: { category: WikiCategory }) {
  const categories = useNovelStore((s) => s.categories);
  const docs = useNovelStore((s) => s.docs);
  const items = useNovelStore((s) => s.items);
  const state = { categories, docs, items };
  const id = category.id;
  const locked = !!category.system;
  const docCount = Object.values(docs).filter((d) => d.categoryId === id).length;

  // 최상위로 = 마지막 최상위 분류 뒤로
  const lastRoot = childCategories(categories)
    .filter((c) => c.id !== id)
    .at(-1);
  const rootError = !lastRoot || !!dropError(state, id, lastRoot.id, "after");

  return (
    <div className="flex max-w-md flex-col gap-6">
      {locked && (
        <p className="flex items-center gap-1.5 text-caption text-muted">
          <Lock size={12} />
          기본 분류 — 삭제 · 이동 불가, 이름과 템플릿만 바꿀 수 있어요
        </p>
      )}

      <Field label="분류 이름">
        <input
          key={category.name}
          aria-label="분류 이름"
          defaultValue={category.name}
          className={fieldClass}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing || e.keyCode === 229) return;
            if (e.key === "Escape") e.currentTarget.value = category.name;
            if (e.key === "Enter" || e.key === "Escape") e.currentTarget.blur();
          }}
          onBlur={(e) => {
            const name = e.currentTarget.value.trim();
            if (name && name !== category.name) renameCategory(id, name);
            else e.currentTarget.value = category.name;
          }}
        />
      </Field>

      <Field label="상위 분류">
        <select
          aria-label="상위 분류"
          value={category.parentId ?? ""}
          disabled={locked}
          className={fieldClass}
          onChange={(e) =>
            e.target.value
              ? moveCategory(id, e.target.value, "inside")
              : lastRoot && moveCategory(id, lastRoot.id, "after")
          }
        >
          <option value="" disabled={rootError && !!category.parentId}>
            (최상위)
          </option>
          {flatCategories(categories)
            .filter(({ category: c }) => c.id !== id)
            .map(({ category: c, depth }) => (
              <option
                key={c.id}
                value={c.id}
                disabled={c.id !== category.parentId && !!dropError(state, id, c.id, "inside")}
              >
                {"　".repeat(depth)}
                {c.name}
              </option>
            ))}
        </select>
      </Field>

      <Field label="분류 색">
        {locked ? (
          <span className="flex items-center gap-2 text-caption text-muted">
            <span
              className="size-4 rounded-full"
              style={{ background: `var(--color-${category.color})` }}
            />
            기본 분류 색은 보드 블록 색과 같아 바꿀 수 없어요
          </span>
        ) : (
          <div role="group" aria-label="분류 색" className="flex gap-2">
            {CATEGORY_COLORS.map((c) => (
              <button
                key={c.token}
                type="button"
                aria-label={c.label}
                aria-pressed={category.color === c.token}
                className={`size-5 rounded-full ${category.color === c.token ? "ring-2 ring-ink ring-offset-1" : ""}`}
                style={{ background: `var(--color-${c.token})` }}
                onClick={() => setCategoryColor(id, c.token)}
              />
            ))}
          </div>
        )}
      </Field>

      <Field label="템플릿 속성 (새 문서에 빈 값으로 채워짐)">
        <PropsTable
          keysOnly
          props={category.templateProps.map((key) => ({ key, value: "" }))}
          onChange={(props) =>
            setTemplateProps(
              id,
              props.map((p) => p.key),
            )
          }
        />
        <p className="mt-2 flex items-start gap-1.5 rounded-sm bg-surface-card px-3 py-2 text-caption text-body">
          <Info size={14} className="mt-0.5 shrink-0" />
          템플릿 변경은 새 문서에만 적용돼요. 기존 문서 {docCount}개는 그대로입니다.
        </p>
      </Field>
    </div>
  );
}
