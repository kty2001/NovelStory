import { create } from "zustand";
import { temporal } from "zundo";
import { applyNodeChanges, type Node, type NodeChange } from "@xyflow/react";

type BoardState = {
  nodes: Node[];
  onNodesChange: (changes: NodeChange[]) => void;
};

// 실행 취소 대상: 노드 id·위치·데이터만 (선택·크기 측정 변화는 제외)
const snapshot = (s: BoardState) => ({
  nodes: s.nodes.map((n) => ({ id: n.id, position: n.position, data: n.data })),
});

export const createBoardStore = (initial: Node[]) =>
  create<BoardState>()(
    temporal(
      (set) => ({
        nodes: initial,
        onNodesChange: (changes) => set((s) => ({ nodes: applyNodeChanges(changes, s.nodes) })),
      }),
      {
        partialize: snapshot as never,
        equality: (a, b) => JSON.stringify(a) === JSON.stringify(b),
      },
    ),
  );

export type BoardStore = ReturnType<typeof createBoardStore>;

// 드래그 중에는 기록을 멈추고, 끝나면 드래그 시작 상태를 한 번만 기록
export function trackDrag(store: BoardStore) {
  let start: ReturnType<typeof snapshot> | null = null;
  return {
    onNodeDragStart: () => {
      start = snapshot(store.getState());
      store.temporal.getState().pause();
    },
    onNodeDragStop: () => {
      store.temporal.getState().resume();
      if (!start) return;
      const t = store.temporal;
      t.setState({ pastStates: [...t.getState().pastStates, start as never], futureStates: [] });
      start = null;
    },
  };
}

// partialize된 과거 상태를 되돌릴 때 선택·측정값은 현재 노드에서 유지
export function undo(store: BoardStore) {
  const past = store.temporal.getState().pastStates.at(-1) as ReturnType<typeof snapshot> | undefined;
  if (!past) return;
  const current = store.getState().nodes;
  const before = snapshot(store.getState());
  store.temporal.getState().pause();
  store.setState({
    nodes: past.nodes.map((p) => ({ ...(current.find((c) => c.id === p.id) ?? { type: "sticky" }), ...p }) as Node),
  });
  store.temporal.setState((t) => ({
    pastStates: t.pastStates.slice(0, -1),
    futureStates: [before as never, ...t.futureStates],
  }));
  store.temporal.getState().resume();
}
