import { useEffect, type RefObject } from "react";

// React Flow는 크기를 잴 때까지 노드를 숨김 → 보일 때까지 몇 프레임 포커스 재시도 후 전체 선택
export function useFocusWhenVisible(ref: RefObject<HTMLInputElement | HTMLTextAreaElement | null>) {
  useEffect(() => {
    let frame = 0;
    let tries = 0;
    const focus = () => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      if (document.activeElement === el) el.select();
      else if (tries++ < 20) frame = requestAnimationFrame(focus);
    };
    focus();
    return () => cancelAnimationFrame(frame);
  }, [ref]);
}
