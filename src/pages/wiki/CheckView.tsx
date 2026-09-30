import type { ReactNode } from "react";
import EmptyState from "../../components/EmptyState";
import { useNovelStore } from "../../store/novelStore";
import { placeText, stateText } from "./boardLinks";
import { issueCount, settingIssues } from "./check";
import { useWikiNav } from "./useWikiNav";

type Row = { id: string; title: string; detail: string; onClick: () => void };

function Section({ title, hint, rows }: { title: string; hint: string; rows: Row[] }) {
  if (!rows.length) return null;
  return (
    <section aria-label={title} className="mt-8">
      <h3 className="flex items-baseline gap-2 text-title-sm text-ink">
        {title}
        <span className="text-caption text-muted tabular-nums">{rows.length}</span>
      </h3>
      <p className="mt-0.5 text-caption text-muted">{hint}</p>
      <ul className="mt-2 border-t border-hairline">
        {rows.map((r) => (
          <li key={r.id} className="border-b border-hairline">
            <button
              type="button"
              data-testid="check-row"
              className="flex w-full items-center gap-3 px-2 py-2 text-left hover:bg-surface-soft"
              onClick={r.onClick}
            >
              <span className="text-body-sm text-ink">{r.title || "제목 없음"}</span>
              <span className="truncate text-caption text-muted">{r.detail}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

// 설정 점검 (F4): 보드 · 사전을 훑어 놓치기 쉬운 항목 일람. 문서 항목 = 문서 열기, 블록 항목 = 보드 그 블록
export default function CheckView() {
  const categories = useNovelStore((s) => s.categories);
  const docs = useNovelStore((s) => s.docs);
  const items = useNovelStore((s) => s.items);
  const scale = useNovelStore((s) => s.board?.timeScale);
  const { openDoc, openBoard } = useWikiNav();
  if (!scale) return null;
  const issues = settingIssues({ categories, docs, items });
  const total = issueCount(issues);
  const title = (docId: string) => docs[docId]?.title ?? "";

  const sections: { title: string; hint: string; rows: Row[] }[] = [
    {
      title: "보드에 없는 캐릭터 · 사건",
      hint: "문서만 있고 보드 블록이 없어요. 보드의 문서 목록에서 끌어 배치할 수 있어요",
      rows: issues.unplaced.map((d) => ({
        id: d.id,
        title: d.title,
        detail: categories[d.categoryId]?.name ?? "",
        onClick: () => openDoc(d.id),
      })),
    },
    {
      title: "퇴장 이후 상태",
      hint: "앞선 시점에 퇴장한 캐릭터의 상태 블록",
      rows: issues.afterExit.map((s) => ({
        id: s.id,
        title: title(s.docId),
        detail: `${placeText(s.place, scale)} · ${stateText(s)}`,
        onClick: () => openBoard(s.id),
      })),
    },
    {
      title: "시점 미정 사건",
      hint: "보드 미정 영역에 있는 사건. 시간축으로 옮기면 시점이 정해져요",
      rows: issues.undated.map((e) => ({
        id: e.id,
        title: title(e.docId),
        detail: "미정",
        onClick: () => openBoard(e.id),
      })),
    },
    {
      title: "깨진 링크",
      hint: "삭제된 문서를 가리키는 @ 링크가 본문에 남아 있어요",
      rows: issues.broken.map(({ doc, count }) => ({
        id: doc.id,
        title: doc.title,
        detail: `깨진 링크 ${count}개`,
        onClick: () => openDoc(doc.id),
      })),
    },
    {
      title: "빈 템플릿 속성",
      hint: "분류 템플릿 속성 중 값이 비어 있어요",
      rows: issues.emptyProps.map(({ doc, keys }) => ({
        id: doc.id,
        title: doc.title,
        detail: keys.join(" · "),
        onClick: () => openDoc(doc.id),
      })),
    },
  ];

  let body: ReactNode = sections.map((s) => <Section key={s.title} {...s} />);
  if (!total) {
    body = (
      <EmptyState boxed title="점검할 항목이 없어요">
        보드에 없는 문서 · 퇴장 이후 상태 · 미정 사건 · 깨진 링크 · 빈 템플릿 속성을 확인했어요.
      </EmptyState>
    );
  }

  return (
    <section aria-label="설정 점검">
      <div className="flex items-baseline gap-3">
        <h2 className="text-title-lg text-ink">설정 점검</h2>
        <span className="text-body-sm text-muted">항목 {total}</span>
      </div>
      {body}
    </section>
  );
}
