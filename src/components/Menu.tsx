import { useCallback, useRef, useState, type ReactNode } from "react";
import { useDismiss } from "./useDismiss";

export type MenuItem = {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
  hint?: string; // 오른쪽 보조 문구 (비활성 이유 등)
};

// 메뉴 목록: ⋯ 드롭다운과 우클릭 메뉴 공용. 위치는 className으로 지정
export function MenuList({
  items,
  onClose,
  className = "",
}: {
  items: MenuItem[];
  onClose: () => void;
  className?: string;
}) {
  return (
    <ul
      role="menu"
      className={`z-20 min-w-40 rounded-md border border-hairline bg-canvas py-1 shadow-float ${className}`}
    >
      {items.map((item) => (
        <li key={item.label}>
          <button
            type="button"
            role="menuitem"
            disabled={item.disabled}
            className={`flex w-full items-center gap-2 px-3 py-2 text-left text-body-sm hover:bg-surface-card disabled:text-muted-soft disabled:hover:bg-transparent ${item.danger ? "text-error" : "text-ink"}`}
            onClick={(e) => {
              e.stopPropagation();
              onClose();
              item.onSelect();
            }}
          >
            {item.icon}
            {item.label}
            {item.hint && <span className="ml-auto pl-4 text-caption text-muted">{item.hint}</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}

// ⋯ 드롭다운: 바깥 클릭·Esc로 닫힘
export default function Menu({
  label,
  trigger,
  items,
}: {
  label: string;
  trigger: ReactNode;
  items: MenuItem[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-surface-strong"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        {trigger}
      </button>
      {open && <MenuList items={items} onClose={close} className="absolute right-0 mt-1" />}
    </div>
  );
}
