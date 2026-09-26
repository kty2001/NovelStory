import { useEffect, useRef, type ImgHTMLAttributes } from "react";

// IndexedDB Blob 표시: object URL을 만들고 바뀌거나 사라질 때 해제
export default function BlobImage({
  blob,
  ...rest
}: { blob: Blob } & Omit<ImgHTMLAttributes<HTMLImageElement>, "src">) {
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const url = URL.createObjectURL(blob);
    ref.current!.src = url;
    return () => URL.revokeObjectURL(url);
  }, [blob]);

  return <img ref={ref} {...rest} />;
}
