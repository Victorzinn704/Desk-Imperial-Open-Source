export function trimTrailingDecimalZeros(value: string): string {
  const decimalSeparatorIndex = value.indexOf('.')
  if (decimalSeparatorIndex === -1) {
    return value
  }

  let end = value.length
  while (end > decimalSeparatorIndex + 1 && value.codePointAt(end - 1) === 48) {
    end -= 1
  }

  if (end === decimalSeparatorIndex + 1) {
    end = decimalSeparatorIndex
  }

  return value.slice(0, end)
}
