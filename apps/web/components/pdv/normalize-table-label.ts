/**
 * Normaliza o label de mesa para um formato consistente.
 *
 * Aceita variações como:
 *   "mesa 2", "mesa2", "Ms2", "ms 2", "Mesa nº 2", "MESA-02", "2"
 * → todas normalizam para "2"
 *
 * Para labels especiais (VIP, BAR, etc.), retorna em uppercase.
 *   "vip", "VIP", "mesa vip" → "VIP"
 */
export function normalizeTableLabel(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) {
    return trimmed
  }

  // Remove prefixos comuns: "mesa", "ms", "m", "nº", "n", "#", "-", espaços
  const cleaned = trimmed
    .replace(/^(mesa|ms|m)\s*[-–—#nº.:]*\s*/i, '')
    .replace(/^[-–—#nº.:]+\s*/, '')
    .trim()

  // Se o resultado for numérico puro, remove zeros à esquerda
  if (/^\d+$/.test(cleaned)) {
    return String(Number(cleaned))
  }

  // Labels especiais → uppercase
  return cleaned.toUpperCase()
}
