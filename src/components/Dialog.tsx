import { useEffect, useRef, type ReactNode } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
};

// 네이티브 <dialog> 모달: Esc·바깥 클릭으로 닫기, 포커스 가두기는 브라우저 기본 동작
export default function Dialog({ open, onClose, title, children, footer, className = "" }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      className={`m-auto w-[min(520px,calc(100vw-32px))] rounded-lg border border-hairline bg-canvas p-6 text-body backdrop:bg-surface-dark/40 ${className}`}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {open && (
        <>
          <h2 className="mb-4 text-title-md text-ink">{title}</h2>
          {children}
          {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
        </>
      )}
    </dialog>
  );
}
