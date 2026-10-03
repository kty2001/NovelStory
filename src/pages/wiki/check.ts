import type { BoardItem, EventItem, StateItem, WikiCategory, WikiDoc } from "../../db/types";
import type { Collection } from "../../store/novelStore";
import { afterExit } from "../board/stateCalc";
import { byPlace } from "./boardLinks";
import { byTitle, familyOf, usedDocIds } from "./categories";

type SettingIssues = {
  unplaced: WikiDoc[]; // 보드에 없는 캐릭터 · 사건 문서
  afterExit: StateItem[]; // 퇴장 이후 상태 블록
  undated: EventItem[]; // 미정 영역 사건
  broken: { doc: WikiDoc; count: number }[]; // 깨진 링크가 있는 문서
  emptyProps: { doc: WikiDoc; keys: string[] }[]; // 분류 템플릿 키 값이 빈 문서
};

// 설정 점검 (F4): 보드 · 사전 데이터에서 계산, 막지 않고 목록만
export function settingIssues({
  categories,
  docs,
  items,
}: {
  categories: Collection<WikiCategory>;
  docs: Collection<WikiDoc>;
  items: Collection<BoardItem>;
}): SettingIssues {
  const all = Object.values(docs).sort(byTitle);
  const blocks = Object.values(items);
  const used = usedDocIds(items);
  return {
    unplaced: all.filter((d) => !used.has(d.id) && familyOf(categories, d.categoryId)),
    afterExit: blocks
      .filter((i): i is StateItem => i.kind === "state" && afterExit(i, items))
      .sort(byPlace),
    undated: blocks
      .filter((i): i is EventItem => i.kind === "event" && i.place.mode === "undated")
      .sort(byPlace),
    broken: all.flatMap((doc) => {
      const count = new Set(doc.mentions.filter((id) => !docs[id])).size;
      return count ? [{ doc, count }] : [];
    }),
    emptyProps: all.flatMap((doc) => {
      const keys = (categories[doc.categoryId]?.templateProps ?? []).filter(
        (k) => !doc.props.find((p) => p.key === k)?.value.trim(),
      );
      return keys.length ? [{ doc, keys }] : [];
    }),
  };
}

export const issueCount = (i: SettingIssues) =>
  i.unplaced.length + i.afterExit.length + i.undated.length + i.broken.length + i.emptyProps.length;
