import type { Board, ISODate, StoryLine, WikiCategory } from "./types";

// 새 소설 기본값 (UC-01). 템플릿 키는 새 문서에만 적용 (UC-32)
const CATEGORIES: Pick<WikiCategory, "name" | "color" | "templateProps" | "system">[] = [
  {
    name: "캐릭터",
    system: "character",
    color: "brand-mint",
    templateProps: ["나이", "성별", "소속", "능력"],
  },
  { name: "사건", system: "event", color: "brand-peach", templateProps: [] },
  { name: "장소", color: "brand-teal", templateProps: ["지역", "특징"] },
  { name: "세력·조직", color: "brand-pink", templateProps: ["대표", "거점"] },
  { name: "아이템", color: "brand-ochre", templateProps: ["소유자", "능력"] },
  { name: "세계관 설정", color: "brand-lavender", templateProps: [] },
];

const LINES = ["메인", "서브", "사이드"];

export function defaultBoard(novelId: string, now: ISODate): Board {
  return {
    id: novelId,
    novelId,
    updatedAt: now,
    timeScale: { pxPerTick: 120, collapsedPx: 40, tickLabels: {}, collapsed: [], snap: true },
    stateLanes: { enabled: false, order: [] },
  };
}

export function defaultCategories(novelId: string, now: ISODate): WikiCategory[] {
  return CATEGORIES.map((c, order) => ({
    ...c,
    id: crypto.randomUUID(),
    novelId,
    updatedAt: now,
    order,
    templateProps: [...c.templateProps],
  }));
}

export function defaultLines(novelId: string, now: ISODate): StoryLine[] {
  return LINES.map((name, order) => ({
    id: crypto.randomUUID(),
    novelId,
    updatedAt: now,
    name,
    order,
    color: "muted",
  }));
}
