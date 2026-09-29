import type { WikiDoc } from "../../db/types";
import type { Collection } from "../../store/novelStore";

// 사전 전체 검색 (UC-34, W-4): 제목 · 별칭 · 본문 부분 일치 (대소문자 무시, 초성 검색은 MVP 이후)

export type Hit = {
  doc: WikiDoc;
  where: "title" | "alias" | "body";
  alias?: string;
  // 일치 부분 강조용 문맥 (제목 · 별칭은 그 문자열, 본문은 앞뒤 약 30자)
  before: string;
  match: string;
  after: string;
};

const CONTEXT_CHARS = 30;
const ORDER = { title: 0, alias: 1, body: 2 } as const;

function split(text: string, at: number, len: number, cut = Infinity) {
  const before = text.slice(0, at);
  const after = text.slice(at + len);
  return {
    before: before.length > cut ? `…${before.slice(-cut)}` : before,
    match: text.slice(at, at + len),
    after: after.length > cut ? `${after.slice(0, cut)}…` : after,
  };
}

export function searchWiki(docs: Collection<WikiDoc>, query: string): Hit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const hits: Hit[] = [];
  for (const doc of Object.values(docs)) {
    const t = doc.title.toLowerCase().indexOf(q);
    if (t >= 0) {
      hits.push({ doc, where: "title", ...split(doc.title, t, q.length) });
      continue;
    }
    const alias = doc.aliases.find((a) => a.toLowerCase().includes(q));
    if (alias) {
      const at = alias.toLowerCase().indexOf(q);
      hits.push({ doc, where: "alias", alias, ...split(alias, at, q.length) });
      continue;
    }
    const b = doc.plainText.toLowerCase().indexOf(q);
    if (b >= 0) {
      const text = doc.plainText.replace(/\n/g, " ");
      hits.push({ doc, where: "body", ...split(text, b, q.length, CONTEXT_CHARS) });
    }
  }
  return hits.sort(
    (a, b) => ORDER[a.where] - ORDER[b.where] || a.doc.title.localeCompare(b.doc.title, "ko"),
  );
}
