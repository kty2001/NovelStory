// data_model.md 3장 MVP 타입

export type ISODate = string;

export type BaseRecord = { id: string; updatedAt: ISODate; deletedAt?: ISODate };
export type NovelScoped = BaseRecord & { novelId: string };

export type ColorToken = string; // ui_guide.md 토큰 이름 (예: 'brand-peach', 'sticky-yellow')

// F4에서 Tiptap JSONContent로 교체
export type TiptapJSON = { type?: string; [key: string]: unknown };

// ── 서재 ──
export type Novel = BaseRecord & {
  title: string;
  genre?: string;
  synopsis?: string;
  coverImageId?: string;
  createdAt: ISODate;
  lastExportedAt?: ISODate;
};

// ── 이미지 ──
export type ImageAsset = NovelScoped & {
  blob: Blob;
  mime: string;
  width: number;
  height: number;
  bytes: number;
};

// ── 사전 ──
export type WikiCategory = NovelScoped & {
  name: string;
  parentId?: string;
  order: number;
  templateProps: string[];
  color: ColorToken;
  system?: "character" | "event";
};

export type WikiProp = { key: string; value: string };

export type StoryLine = NovelScoped & {
  name: string;
  order: number;
  color: ColorToken;
};

export type WikiDoc = NovelScoped & {
  categoryId: string;
  title: string;
  aliases: string[];
  tags: string[];
  lineId?: string;
  props: WikiProp[];
  body: TiptapJSON | null;
  imageId?: string;
  color?: ColorToken;
  createdAt: ISODate;
  autoCreated?: boolean;

  // 파생 필드: 저장 시 body에서 계산, 내보내기 제외
  mentions: string[];
  plainText: string;
};

// ── 보드 ──
export type TimeScale = {
  pxPerTick: number;
  collapsedPx: number;
  tickLabels: Record<string, string>;
  collapsed: { from: number; to: number }[];
  snap: boolean;
};

export type Board = BaseRecord & {
  novelId: string; // id = novelId
  timeScale: TimeScale;
  stateLanes: { enabled: boolean; order: string[] };
};

export type TimedPlace = { mode: "timed"; t: number; tEnd?: number; y: number };
export type UndatedPlace = { mode: "undated"; x: number; y: number };
export type FreePlace = { mode: "free"; x: number; y: number };

type BoardItemBase = NovelScoped & {
  z: number;
  parentFrameId?: string;
};

export type EventItem = BoardItemBase & {
  kind: "event";
  place: TimedPlace | UndatedPlace;
  docId: string;
  color: ColorToken;
};

export type PropChange = { key: string; from?: string; to: string };

export type StateItem = BoardItemBase & {
  kind: "state";
  place: TimedPlace | UndatedPlace;
  docId: string;
  stateType: "appear" | "change" | "exit";
  changes: PropChange[];
  note: string;
  linkedEventItemId?: string;
};

export type StickyItem = BoardItemBase & {
  kind: "sticky";
  place: FreePlace;
  w: number;
  h: number;
  text: string;
  color: ColorToken;
};

export type TextItem = BoardItemBase & {
  kind: "text";
  place: FreePlace;
  w: number;
  text: string;
};

export type FrameItem = BoardItemBase & {
  kind: "frame";
  place: FreePlace;
  w: number;
  h: number;
  title: string;
  parentFrameId?: never;
};

export type BoardItem = EventItem | StateItem | StickyItem | TextItem | FrameItem;

export type BoardEdge = NovelScoped & {
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
  dashed: boolean;
};

// ── 로컬 전용 (동기화·내보내기 제외) ──
export type UiState = {
  novelId: string;
  viewport: { x: number; y: number; zoom: number };
  lastTab: "board" | "wiki";
  wikiPanelDocId?: string;
  backupSnoozedUntil?: ISODate;
  filters?: {
    hiddenDocIds: string[];
    hiddenTags: string[];
    hiddenCategoryIds: string[];
    hiddenLineIds: string[]; // 'none' = 미지정
  };
};

export type AppMeta =
  | { key: "persist"; requestedAt: ISODate; granted: boolean }
  | { key: "librarySort"; value: "updated" | "title" };
