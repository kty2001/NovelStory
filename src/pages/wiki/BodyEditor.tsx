import {
  EditorContent,
  useEditor,
  useEditorState,
  type ChainedCommands,
  type JSONContent,
} from "@tiptap/react";
import Mention from "@tiptap/extension-mention";
import StarterKit from "@tiptap/starter-kit";
import type { ReactNode } from "react";
import type { TiptapJSON } from "../../db/types";
import { setDocBody } from "../../store/wikiActions";

// 본문 서식: H1~H3 · 목록 · 굵게 · 기울임 · 인용 (UC-31). 명세 밖 서식은 끔
const EXTENSIONS = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    code: false,
    codeBlock: false,
    strike: false,
    underline: false,
    link: false,
    horizontalRule: false,
  }),
  // 저장된 멘션 노드 표시용. `@` 후보 입력은 "@ 링크" 항목에서
  Mention.configure({ HTMLAttributes: { class: "mention" } }),
];

type Tool = {
  label: string;
  node: ReactNode;
  active: [string, object?];
  cmd: (c: ChainedCommands) => ChainedCommands;
};

const TOOLS: Tool[] = [
  {
    label: "제목 1",
    node: "H1",
    active: ["heading", { level: 1 }],
    cmd: (c) => c.toggleHeading({ level: 1 }),
  },
  {
    label: "제목 2",
    node: "H2",
    active: ["heading", { level: 2 }],
    cmd: (c) => c.toggleHeading({ level: 2 }),
  },
  {
    label: "제목 3",
    node: "H3",
    active: ["heading", { level: 3 }],
    cmd: (c) => c.toggleHeading({ level: 3 }),
  },
  { label: "굵게", node: <b>B</b>, active: ["bold"], cmd: (c) => c.toggleBold() },
  { label: "기울임", node: <i>I</i>, active: ["italic"], cmd: (c) => c.toggleItalic() },
  { label: "글머리 목록", node: "•", active: ["bulletList"], cmd: (c) => c.toggleBulletList() },
  { label: "번호 목록", node: "1.", active: ["orderedList"], cmd: (c) => c.toggleOrderedList() },
  { label: "인용", node: "❝", active: ["blockquote"], cmd: (c) => c.toggleBlockquote() },
];

// 사전 본문 (Tiptap). 실행 취소는 Tiptap 자체 기록, 빈 본문은 null 저장
export default function BodyEditor({
  docId,
  initial,
}: {
  docId: string;
  initial: TiptapJSON | null;
}) {
  const editor = useEditor({
    extensions: EXTENSIONS,
    content: (initial as JSONContent | null) ?? "",
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": "본문",
        class: "min-h-40 py-2",
      },
    },
    // 읽지 못한 본문은 편집을 막아 원본을 덮어쓰지 않음
    enableContentCheck: true,
    onContentError: ({ editor }) => editor.setEditable(false),
    onUpdate: ({ editor }) => setDocBody(docId, editor.isEmpty ? null : editor.getJSON()),
  });
  const active = useEditorState({
    editor,
    selector: ({ editor }) => ({
      marks: TOOLS.map((t) => editor.isActive(...t.active)),
      editable: editor.isEditable,
    }),
  });

  return (
    <div>
      <div
        role="toolbar"
        aria-label="본문 서식"
        className="flex w-fit gap-0.5 rounded-sm border border-hairline p-0.5"
      >
        {TOOLS.map((t, i) => (
          <button
            key={t.label}
            type="button"
            aria-label={t.label}
            aria-pressed={active.marks[i]}
            className={`flex size-8 items-center justify-center rounded-xs text-body-sm ${active.marks[i] ? "bg-surface-strong text-ink" : "text-body hover:bg-surface-card"}`}
            // 누를 때 본문 포커스 · 선택 유지
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => t.cmd(editor.chain().focus()).run()}
          >
            {t.node}
          </button>
        ))}
      </div>
      {!active.editable && (
        <p role="alert" className="mt-2 text-caption text-error">
          본문 형식을 읽지 못해 편집할 수 없어요. 내용은 저장된 그대로 보존돼요.
        </p>
      )}
      <EditorContent editor={editor} className="mt-2" />
    </div>
  );
}
