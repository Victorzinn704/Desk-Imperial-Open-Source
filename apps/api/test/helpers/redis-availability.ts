import { spawnSync } from 'node:child_process'
import { getRedisUrlKeys, resolveRedisUrl } from '../../src/common/utils/redis-url.util'

const DEFAULT_LOCAL_REDIS_HOST = '127.0.0.1'
const DEFAULT_LOCAL_REDIS_PORT = 6379
const DEFAULT_LOCAL_REDIS_PASSWORD = 'change_me_in_prod'
const REDIS_PING_TIMEOUT_MS = 750

type EnvLike = NodeJS.ProcessEnv

type RedisAvailabilityBase = {
  envKeys: readonly string[]
  redisUrl: string
  source: 'env' | 'local-compose'
}

export type RedisAvailability =
  | (RedisAvailabilityBase & {
      shouldSkip: false
    })
  | (RedisAvailabilityBase & {
      shouldSkip: true
      reason: string
    })

function buildLocalComposeRedisUrl(env: EnvLike): string {
  const password = env.REDIS_PASSWORD?.trim() || DEFAULT_LOCAL_REDIS_PASSWORD
  return `redis://:${encodeURIComponent(password)}@${DEFAULT_LOCAL_REDIS_HOST}:${DEFAULT_LOCAL_REDIS_PORT}`
}

export function canPingRedisSync(redisUrl: string, timeoutMs = REDIS_PING_TIMEOUT_MS): boolean {
  // Jest decide `describe` vs `describe.skip` synchronously, so the probe runs in
  // a short-lived child process to keep the test definition deterministic.
  const probeScript = `
    const Redis = require('ioredis');
    const client = new Redis(${JSON.stringify(redisUrl)}, {
      connectTimeout: ${timeoutMs},
      enableOfflineQueue: false,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
    });
    let settled = false;
    const finish = (code) => {
      if (settled) return;
      settled = true;
      try { client.disconnect(); } catch {}
      process.exit(code);
    };
    client.on('error', () => {});
    setTimeout(() => finish(1), ${timeoutMs + 100});
    (async () => {
      try {
        await client.connect();
        await client.ping();
        finish(0);
      } catch {
        finish(1);
      }
    })();
  `

  const result = spawnSync(process.execPath, ['-e', probeScript], {
    stdio: 'ignore',
    timeout: timeoutMs + 750,
    windowsHide: true,
  })

  return result.status === 0
}

export function resolveRedisAvailability(env: EnvLike = process.env): RedisAvailability {
  const envKeys = getRedisUrlKeys()
  const explicitRedisUrl = resolveRedisUrl(env)

  if (explicitRedisUrl) {
    return {
      envKeys,
      redisUrl: explicitRedisUrl,
      shouldSkip: false,
      source: 'env',
    }
  }

  const localComposeRedisUrl = buildLocalComposeRedisUrl(env)
  if (canPingRedisSync(localComposeRedisUrl)) {
    return {
      envKeys,
      redisUrl: localComposeRedisUrl,
      shouldSkip: false,
      source: 'local-compose',
    }
  }

  return {
    envKeys,
    reason: 'Redis indisponível sem REDIS_URL explícita e sem resposta do compose local em redis://127.0.0.1:6379.',
    redisUrl: localComposeRedisUrl,
    shouldSkip: true,
    source: 'local-compose',
  }
}
