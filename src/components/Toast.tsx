import type { ReactNode } from "react";

// 화면 하단 알림 (되돌리기 등). 표시 시간은 호출하는 쪽에서 관리
export default function Toast({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div
      role="status"
      className="fixed bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-4 rounded-md bg-primary px-4 py-2 text-body-sm text-on-primary shadow-float"
    >
      {children}
      {action}
    </div>
  );
}
