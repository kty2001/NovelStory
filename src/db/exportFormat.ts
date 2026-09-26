import type {
  Board,
  BoardEdge,
  BoardItem,
  ImageAsset,
  ISODate,
  Novel,
  StoryLine,
  WikiCategory,
  WikiDoc,
} from "./types";

// data_model.md 7장
export const EXPORT_FORMAT = "whitenoard-novel";
export const SCHEMA_VERSION = 1;

export type NovelExport = {
  format: typeof EXPORT_FORMAT;
  schemaVersion: typeof SCHEMA_VERSION;
  exportedAt: ISODate;
  novel: Novel;
  board: Board;
  boardItems: BoardItem[];
  boardEdges: BoardEdge[];
  wikiCategories: WikiCategory[];
  wikiDocs: Omit<WikiDoc, "mentions" | "plainText">[];
  storyLines: StoryLine[];
  images: (Omit<ImageAsset, "blob"> & { dataUrl: string })[];
};

type RawExport = Record<string, unknown> & { schemaVersion: number };

// migrations[v]: v → v+1 변환
export const migrations: Record<number, (data: RawExport) => RawExport> = {};

export class ExportFormatError extends Error {
  constructor(
    readonly reason: "format" | "newer",
    message: string,
  ) {
    super(message);
  }
}

// 가져오기 1·2단계: 형식 확인 → 더 새로운 버전 거부 → 이전 버전은 차례로 변환
export function upgradeExport(
  raw: unknown,
  steps: Record<number, (data: RawExport) => RawExport> = migrations,
): NovelExport {
  if (
    typeof raw !== "object" ||
    raw === null ||
    (raw as RawExport).format !== EXPORT_FORMAT ||
    !Number.isInteger((raw as RawExport).schemaVersion)
  ) {
    throw new ExportFormatError("format", "WhiteNoard 소설 파일이 아님");
  }
  let data = raw as RawExport;
  if (data.schemaVersion > SCHEMA_VERSION) {
    throw new ExportFormatError(
      "newer",
      "더 새로운 버전의 파일. 앱을 새로고침해 최신 버전으로 업데이트",
    );
  }
  while (data.schemaVersion < SCHEMA_VERSION) {
    const step = steps[data.schemaVersion];
    if (!step) throw new ExportFormatError("format", `v${data.schemaVersion} 변환 없음`);
    data = step(data);
  }
  return data as unknown as NovelExport;
}
