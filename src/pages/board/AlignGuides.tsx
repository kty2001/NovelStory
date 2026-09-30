import { useStore, ViewportPortal } from "@xyflow/react";
import type { Guide } from "./align";

// 정렬 보조선 (ui_guide `alignment-guide`): 1px brand-coral, 줌과 무관하게 화면 1px
export default function AlignGuides({ guides }: { guides: Guide[] }) {
  const zoom = useStore((s) => s.transform[2]);
  const px = 1 / zoom;
  return (
    <ViewportPortal>
      {guides.map((g) => (
        <div
          key={`${g.axis}${g.at}`}
          data-testid="align-guide"
          className="pointer-events-none absolute bg-brand-coral"
          style={
            g.axis === "x"
              ? {
                  transform: `translate(${g.at - px / 2}px, ${g.from}px)`,
                  width: px,
                  height: g.to - g.from,
                }
              : {
                  transform: `translate(${g.from}px, ${g.at - px / 2}px)`,
                  width: g.to - g.from,
                  height: px,
                }
          }
        />
      ))}
    </ViewportPortal>
  );
}
