import { useEffect, useState } from "react";
import Dexie, { type EntityTable } from "dexie";
import { expose } from "../shared/expose";

type ImageRow = { id: number; mode: string; blob: Blob };

const db = new Dexie("c8-spike") as Dexie & { images: EntityTable<ImageRow, "id"> };
db.version(1).stores({ images: "++id, mode" });

const W = 4000;
const H = 3000;

// 사진과 비슷한 엔트로피의 합성 이미지 (그라데이션 + 도형 + 약한 노이즈)
async function makePhoto(seed: number): Promise<Blob> {
  const canvas = new OffscreenCanvas(W, H);
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, `hsl(${(seed * 47) % 360} 60% 55%)`);
  g.addColorStop(1, `hsl(${(seed * 47 + 120) % 360} 50% 35%)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  let r = seed * 9301 + 49297;
  const rand = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 400; i++) {
    ctx.fillStyle = `hsla(${rand() * 360} 60% ${30 + rand() * 50}% / 0.5)`;
    ctx.beginPath();
    ctx.arc(rand() * W, rand() * H, 20 + rand() * 300, 0, Math.PI * 2);
    ctx.fill();
  }
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rand() - 0.5) * 40;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
  return canvas.convertToBlob({ type: "image/jpeg", quality: 0.9 });
}

// 긴 변 1600px, WebP 품질 0.8
export async function resize(blob: Blob, maxSide = 1600): Promise<Blob> {
  // 디코딩 1회: 원본 비트맵에서 축소 비트맵 생성
  const bmp = await createImageBitmap(blob);
  const k = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * k);
  const h = Math.round(bmp.height * k);
  const small = await createImageBitmap(bmp, { resizeWidth: w, resizeHeight: h, resizeQuality: "high" });
  bmp.close();
  const canvas = new OffscreenCanvas(w, h);
  canvas.getContext("2d")!.drawImage(small, 0, 0);
  small.close();
  return canvas.convertToBlob({ type: "image/webp", quality: 0.8 });
}

const MB = (b: number) => Math.round((b / 1024 / 1024) * 10) / 10;
const avg = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);

async function run(count: number, mode: "original" | "resized", onProgress: (s: string) => void) {
  await db.images.clear();
  const photos: Blob[] = [];
  for (let i = 0; i < Math.min(count, 5); i++) photos.push(await makePhoto(i + 1)); // 5종 순환
  const before = (await navigator.storage.estimate()).usage ?? 0;
  const saveMs: number[] = [];
  let bytes = 0;
  for (let i = 0; i < count; i++) {
    const src = photos[i % photos.length];
    const t = performance.now();
    const blob = mode === "resized" ? await resize(src) : src;
    await db.images.add({ mode, blob } as ImageRow);
    saveMs.push(performance.now() - t);
    bytes += blob.size;
    onProgress(`${mode} ${i + 1}/${count}`);
  }
  const after = (await navigator.storage.estimate()).usage ?? 0;
  const t = performance.now();
  const rows = await db.images.where("mode").equals(mode).toArray();
  await Promise.all(rows.map((r) => r.blob.arrayBuffer()));
  const readMs = performance.now() - t;
  return {
    mode,
    count,
    sourceAvgMB: MB(photos.reduce((a, b) => a + b.size, 0) / photos.length),
    totalBlobMB: MB(bytes),
    usageDeltaMB: MB(after - before),
    avgSaveMs: avg(saveMs),
    maxSaveMs: Math.round(Math.max(...saveMs)),
    readAllMs: Math.round(readMs),
  };
}

export default function C8() {
  const [log, setLog] = useState<string[]>([]);
  const [progress, setProgress] = useState("");

  useEffect(() => {
    expose("c8", {
      run: (count: number, mode: "original" | "resized") => run(count, mode, setProgress),
      persist: async () => ({
        persistApi: "persist" in navigator.storage,
        granted: await navigator.storage.persist(),
        persisted: await navigator.storage.persisted(),
        quotaMB: MB((await navigator.storage.estimate()).quota ?? 0),
      }),
      clear: () => db.images.clear(),
    });
  }, []);

  const start = async (mode: "original" | "resized") => {
    const r = await run(50, mode, setProgress);
    setLog((l) => [...l, JSON.stringify(r)]);
  };

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="mb-4 text-xl font-bold">C8 IndexedDB 이미지 용량</h1>
      <div className="mb-4 flex gap-2">
        <button className="rounded-xl bg-ink px-4 py-2 text-white" onClick={() => start("original")}>
          원본 50장 저장
        </button>
        <button className="rounded-xl bg-ink px-4 py-2 text-white" onClick={() => start("resized")}>
          리사이즈 50장 저장
        </button>
      </div>
      <p className="mb-2 text-sm text-muted">{progress}</p>
      <pre className="rounded-lg bg-white p-4 text-xs whitespace-pre-wrap">{log.join("\n")}</pre>
    </main>
  );
}
