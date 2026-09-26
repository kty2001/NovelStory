import type { ResizedImage } from "./novels";

type WorkerResult = ({ ok: true } & ResizedImage) | { ok: false; message: string };

// 이미지 1장마다 Worker를 띄우고 끝나면 종료
export function resizeImage(file: Blob): Promise<ResizedImage> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("../workers/resize.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.onmessage = (e: MessageEvent<WorkerResult>) => {
      worker.terminate();
      if (e.data.ok) resolve(e.data);
      else reject(new Error(e.data.message));
    };
    worker.onerror = (e) => {
      worker.terminate();
      reject(new Error(e.message));
    };
    worker.postMessage(file);
  });
}
