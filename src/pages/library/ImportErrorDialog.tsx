import Button from "../../components/Button";
import Dialog from "../../components/Dialog";
import { ExportFormatError, SCHEMA_VERSION } from "../../db/exportFormat";

// L-5 가져오기 실패: 형식 불일치 / 더 새로운 schemaVersion / 그 외 오류
export default function ImportErrorDialog({
  error,
  onClose,
}: {
  error: unknown;
  onClose: () => void;
}) {
  const newer = error instanceof ExportFormatError && error.reason === "newer";
  const format = error instanceof ExportFormatError && error.reason === "format";
  return (
    <Dialog
      open={!!error}
      onClose={onClose}
      title="가져올 수 없는 파일입니다"
      footer={
        <>
          <Button onClick={onClose}>닫기</Button>
          {newer && (
            <Button variant="primary" onClick={() => location.reload()}>
              새로고침
            </Button>
          )}
        </>
      }
    >
      {newer ? (
        <>
          <p className="text-body-sm">이 파일은 더 새로운 버전의 WhiteNoard에서 만들어졌습니다.</p>
          <p className="mt-3 rounded-md bg-surface-card p-3 text-body-sm">
            파일 버전 <b className="tabular-nums">schemaVersion {error.fileVersion}</b> · 현재 앱{" "}
            <b className="tabular-nums">{SCHEMA_VERSION}</b>
            <br />
            페이지를 새로고침해 최신 버전으로 업데이트한 뒤 다시 가져오세요.
          </p>
        </>
      ) : format ? (
        <p className="text-body-sm">WhiteNoard 백업 파일이 아닙니다.</p>
      ) : (
        <p className="text-body-sm">가져오는 중 오류가 발생했습니다. 잠시 뒤 다시 시도해 주세요.</p>
      )}
    </Dialog>
  );
}
