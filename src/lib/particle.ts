// 받침 여부로 조사 선택 (예: 을/를, 과/와). 한글이 아니면 "을(를)"처럼 둘 다 표시
export function particle(word: string, withFinal: string, withoutFinal: string) {
  const w = word.trim();
  const code = w.charCodeAt(w.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return `${withFinal}(${withoutFinal})`;
  return code % 28 ? withFinal : withoutFinal;
}
