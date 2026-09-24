import { useEffect, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Mention from "@tiptap/extension-mention";
import type { SuggestionKeyDownProps, SuggestionProps } from "@tiptap/suggestion";
import { expose } from "../shared/expose";

type Doc = { id: string; title: string; aliases: string[] };

const DOCS: Doc[] = [
  { id: "d1", title: "홍길동", aliases: ["길동이", "의적"] },
  { id: "d2", title: "활빈당", aliases: ["의적단"] },
  { id: "d3", title: "한양", aliases: ["수도"] },
];

// 제목·별칭 부분 일치 검색
export function searchDocs(query: string) {
  const q = query.trim();
  return DOCS.filter((d) => d.title.includes(q) || d.aliases.some((a) => a.includes(q)));
}

// 후보 목록 팝업 (바닐라 DOM)
function suggestionRenderer() {
  let el: HTMLUListElement | null = null;
  let props: SuggestionProps<Doc> | null = null;
  let active = 0;

  const draw = () => {
    if (!el || !props) return;
    el.innerHTML = "";
    props.items.forEach((item, i) => {
      const li = document.createElement("li");
      li.className = `suggestion-item px-3 py-1 ${i === active ? "bg-[#f5f0e0]" : ""}`;
      li.dataset.id = item.id;
      li.textContent = `${item.title} (${item.aliases.join(", ")})`;
      li.onmousedown = (e) => {
        e.preventDefault();
        props?.command({ id: item.id, label: item.title });
      };
      el!.appendChild(li);
    });
    const rect = props.clientRect?.();
    if (rect) {
      el.style.left = `${rect.left}px`;
      el.style.top = `${rect.bottom + 4}px`;
    }
  };

  return {
    onStart: (p: SuggestionProps<Doc>) => {
      props = p;
      active = 0;
      el = document.createElement("ul");
      el.dataset.testid = "suggestions";
      el.className = "fixed z-50 rounded-lg border border-[#e5e5e5] bg-white text-sm shadow";
      document.body.appendChild(el);
      draw();
    },
    onUpdate: (p: SuggestionProps<Doc>) => {
      props = p;
      active = Math.min(active, Math.max(p.items.length - 1, 0));
      draw();
    },
    onKeyDown: ({ event }: SuggestionKeyDownProps) => {
      if (!props || event.isComposing) return false; // 조합 중 키는 IME에 맡김
      if (event.key === "ArrowDown") {
        active = (active + 1) % Math.max(props.items.length, 1);
        draw();
        return true;
      }
      if (event.key === "ArrowUp") {
        active = (active - 1 + props.items.length) % Math.max(props.items.length, 1);
        draw();
        return true;
      }
      if (event.key === "Enter") {
        const item = props.items[active];
        if (item) props.command({ id: item.id, label: item.title });
        return true;
      }
      return false;
    },
    onExit: () => {
      el?.remove();
      el = null;
      props = null;
    },
  };
}

export default function C1() {
  const [json, setJson] = useState("");
  const editor = useEditor({
    extensions: [
      StarterKit,
      Mention.configure({
        HTMLAttributes: { class: "mention" },
        suggestion: {
          char: "@",
          items: ({ query }) => searchDocs(query),
          render: suggestionRenderer,
        },
      }),
    ],
    content: "",
    onUpdate: ({ editor }) => setJson(JSON.stringify(editor.getJSON(), null, 2)),
  });

  useEffect(() => {
    if (!editor) return;
    expose("c1", {
      getJSON: () => editor.getJSON(),
      getText: () => editor.getText(),
      // 초기 내용은 실행 취소 기록에서 제외
      setContent: (html: string) => editor.chain().setMeta("addToHistory", false).setContent(html).run(),
      setSelection: (pos: number) => editor.commands.setTextSelection(pos),
      focusEnd: () => editor.commands.focus("end"),
      focusStart: () => editor.commands.focus("start"),
      toggleBold: () => editor.chain().focus().toggleBold().run(),
    });
  }, [editor]);

  return (
    <main className="mx-auto grid max-w-5xl grid-cols-2 gap-6 p-8">
      <section>
        <h1 className="mb-2 text-xl font-bold">C1 위키 본문 한글 입력</h1>
        <p className="mb-4 text-sm text-muted">`@` 입력 후 문서 검색: 홍길동(길동이, 의적) · 활빈당(의적단) · 한양(수도)</p>
        <div className="rounded-lg border border-hairline bg-white p-4" data-testid="editor">
          <EditorContent editor={editor} />
        </div>
      </section>
      <pre className="overflow-auto rounded-lg bg-white p-4 text-xs" data-testid="json">
        {json}
      </pre>
    </main>
  );
}
