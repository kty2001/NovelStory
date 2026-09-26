// C8: 업로드 이미지를 긴 변 1600px, WebP 품질 0.8로 변환 (메인 스레드 멈춤 방지)
const MAX_SIDE = 1600;

async function resize(blob: Blob) {
  // 디코딩 1회: 원본 비트맵에서 축소 비트맵 생성
  const bmp = await createImageBitmap(blob);
  const k = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
  const width = Math.round(bmp.width * k);
  const height = Math.round(bmp.height * k);
  const small = await createImageBitmap(bmp, {
    resizeWidth: width,
    resizeHeight: height,
    resizeQuality: "high",
  });
  bmp.close();
  const canvas = new OffscreenCanvas(width, height);
  canvas.getContext("2d")!.drawImage(small, 0, 0);
  small.close();
  return { blob: await canvas.convertToBlob({ type: "image/webp", quality: 0.8 }), width, height };
}

self.onmessage = async (e: MessageEvent<Blob>) => {
  try {
    self.postMessage({ ok: true, ...(await resize(e.data)) });
  } catch (err) {
    self.postMessage({ ok: false, message: String(err) });
  }
};
