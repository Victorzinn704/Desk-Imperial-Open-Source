const ASCII_WHITESPACE = new Set(['\t', '\n', '\v', '\f', '\r', ' '])

function isDigit(char: string | undefined) {
  return char !== undefined && char >= '0' && char <= '9'
}

function isSecondsUnit(char: string | undefined) {
  return char === 's' || char === 'S'
}

export function getLastDigit(value: string) {
  for (let index = value.length - 1; index >= 0; index -= 1) {
    const char = value[index]
    if (isDigit(char)) {
      return char
    }
  }

  return ''
}

export function parseRetryAfterSeconds(message: string, fallbackSeconds: number) {
  let index = 0
  while (index < message.length) {
    if (!isDigit(message[index])) {
      index += 1
      continue
    }

    const start = index
    const end = readDigitEnd(message, start)

    const seconds = readSecondsValue(message, start, end)
    if (seconds != null) {
      return seconds
    }

    index = end
  }

  return fallbackSeconds
}

function readDigitEnd(message: string, start: number) {
  let end = start
  while (end < message.length && isDigit(message[end])) {
    end += 1
  }

  return end
}

function readSecondsValue(message: string, digitsStart: number, digitsEnd: number) {
  let unitIndex = digitsEnd
  while (unitIndex < message.length && ASCII_WHITESPACE.has(message[unitIndex])) {
    unitIndex += 1
  }

  if (!isSecondsUnit(message[unitIndex])) {
    return undefined
  }

  const seconds = Number(message.slice(digitsStart, digitsEnd))
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : undefined
}
