import type Redis from 'ioredis'

const FSM_STATE_TTL_SECONDS = 30 * 60

export async function readTelegramFsmState<T = Record<string, unknown>>(
  client: Redis | null,
  chatId: number | string,
): Promise<T | null> {
  if (!client) {
    return null
  }

  try {
    const raw = await client.get(buildTelegramFsmKey(chatId))
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export async function writeTelegramFsmState(
  client: Redis | null,
  chatId: number | string,
  state: Record<string, unknown>,
) {
  if (!client) {
    return
  }

  try {
    await client.set(buildTelegramFsmKey(chatId), JSON.stringify(state), 'EX', FSM_STATE_TTL_SECONDS)
  } catch {
    // FSM state is best-effort.
  }
}

export async function clearTelegramFsmState(client: Redis | null, chatId: number | string) {
  if (!client) {
    return
  }

  try {
    await client.del(buildTelegramFsmKey(chatId))
  } catch {
    // FSM state is best-effort.
  }
}

function buildTelegramFsmKey(chatId: number | string) {
  return `telegram:fsm:${chatId}`
}
