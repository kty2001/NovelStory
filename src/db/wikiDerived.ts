import type { TiptapJSON } from "./types";

type Node = TiptapJSON & {
  text?: string;
  attrs?: { id?: string; label?: string };
  content?: Node[];
};

const BLOCK = new Set(["paragraph", "heading", "blockquote", "listItem", "codeBlock"]);

// data_model 4.5: 저장 시 body에서 역링크 색인(mentions)·검색용 순수 텍스트(plainText) 계산
export function deriveDoc(body: TiptapJSON | null): { mentions: string[]; plainText: string } {
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
  return {
    mentions: [...mentions],
    plainText: parts
      .join("")
      .replace(/\n{2,}/g, "\n")
      .trim(),
  };
}

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
