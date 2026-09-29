import Button from "../../components/Button";
import Dialog from "../../components/Dialog";
import type { Novel } from "../../db/types";
import { particle } from "../../lib/particle";

type Props = {
  novel: Novel | null;
  onClose: () => void;
  onExport: (novel: Novel) => void;
  onConfirm: (novel: Novel) => void;
};

// L-4 삭제 확인: 제목 표시, 보조 버튼으로 바로 내보내기
export default function DeleteDialog({ novel, onClose, onExport, onConfirm }: Props) {
  const title = novel ? `'${novel.title}'${particle(novel.title, "을", "를")} 삭제할까요?` : "";
  return (
    <Dialog
      open={!!novel}
      onClose={onClose}
      title={title}
      footer={
        novel && (
          <>
            <Button className="mr-auto" onClick={() => onExport(novel)}>
              내보내기
            </Button>
            <Button onClick={onClose}>취소</Button>
            <Button variant="danger" onClick={() => onConfirm(novel)}>
              삭제
            </Button>
          </>
        )
      }
    >
      <p className="text-body-sm">보드 · 사전 · 이미지가 모두 삭제됩니다.</p>
      <p className="text-body-sm text-muted">
        삭제 전에 JSON으로 내보내 두면 나중에 되살릴 수 있어요.
      </p>
    </Dialog>
  );
}
