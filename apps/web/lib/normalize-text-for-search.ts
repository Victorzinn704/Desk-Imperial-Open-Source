const diacriticPattern = /\p{Diacritic}/gu

export function normalizeTextForSearch(value: string) {
  return value.normalize('NFD').replaceAll(diacriticPattern, '').toLowerCase()
}
