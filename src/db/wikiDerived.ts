import type { TiptapJSON, WikiDoc, WikiProp } from "./types";

type Node = TiptapJSON & {
  text?: string;
  attrs?: { id?: string; label?: string };
  content?: Node[];
};

const BLOCK = new Set(["paragraph", "heading", "blockquote", "listItem", "codeBlock"]);

// data_model 4.5: 저장 시 역링크 색인(mentions = 본문 멘션 + 속성 값 링크)·검색용 본문 순수 텍스트(plainText) 계산
export function deriveDoc(
  body: TiptapJSON | null,
  props: WikiProp[] = [],
): { mentions: string[]; plainText: string } {
  const mentions = new Set<string>();
  const parts: string[] = [];
  const walk = (node: Node) => {
    if (node.type === "text" && node.text) parts.push(node.text);
    if (node.type === "mention") {
      if (node.attrs?.id) mentions.add(node.attrs.id);
      if (node.attrs?.label) parts.push(node.attrs.label);
    }
    node.content?.forEach(walk);
    if (node.type && BLOCK.has(node.type)) parts.push("\n");
  };
  if (body) walk(body as Node);
  for (const p of props) if (p.docId) mentions.add(p.docId);
  return {
    mentions: [...mentions],
    plainText: parts
      .join("")
      .replace(/\n{2,}/g, "\n")
      .trim(),
  };
}

// 속성 값 표시 문자열: 문서 링크면 대상의 현재 제목, 대상이 삭제됐으면 저장된 값
export const propText = (p: WikiProp, docs: Record<string, WikiDoc>) =>
  p.docId ? (docs[p.docId]?.title ?? p.value) : p.value;

// 본문의 mention id 치환 (가져오기 ID 재발급)
export function remapMentions(body: TiptapJSON | null, map: (id: string) => string) {
  if (!body) return body;
  const walk = (node: Node): Node => ({
    ...node,
    ...(node.type === "mention" && node.attrs?.id
      ? { attrs: { ...node.attrs, id: map(node.attrs.id) } }
      : {}),
    ...(node.content ? { content: node.content.map(walk) } : {}),
  });
  return walk(body as Node);
}

const CONTEXT_CHARS = 30;
const inlineText = (n: Node) =>
  n.type === "text" ? (n.text ?? "") : n.type === "mention" ? (n.attrs?.label ?? "") : "";

// 역링크 문맥: docId 멘션이 처음 나오는 문단의 멘션 앞뒤 글자, 잘리면 … (UC-33, W-1 ⑨)
export function mentionContext(
  body: TiptapJSON | null,
  docId: string,
): { before: string; after: string } | null {
  let found: { before: string; after: string } | null = null;
  const walk = (node: Node) => {
    if (found || !node.content) return;
    const i = node.content.findIndex((c) => c.type === "mention" && c.attrs?.id === docId);
    if (i < 0) return node.content.forEach(walk);
    const before = node.content.slice(0, i).map(inlineText).join("");
    const after = node.content
      .slice(i + 1)
      .map(inlineText)
      .join("");
    found = {
      before: before.length > CONTEXT_CHARS ? `…${before.slice(-CONTEXT_CHARS)}` : before,
      after: after.length > CONTEXT_CHARS ? `${after.slice(0, CONTEXT_CHARS)}…` : after,
    };
  };
  if (body) walk(body as Node);
  return found;
}
