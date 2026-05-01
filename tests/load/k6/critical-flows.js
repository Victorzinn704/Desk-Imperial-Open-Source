import http from 'k6/http'
import { check, sleep } from 'k6'
import { Trend } from 'k6/metrics'

const healthDuration = new Trend('health_duration', true)
const authLoginDuration = new Trend('auth_login_duration', true)

const baseUrl = __ENV.BASE_URL || 'http://localhost:4000'
const loginPayload = JSON.stringify({
  loginMode: 'OWNER',
  email: __ENV.LOGIN_EMAIL || 'invalid@example.com',
  password: __ENV.LOGIN_PASSWORD || 'invalid-password',
})

const jsonHeaders = {
  headers: {
    'Content-Type': 'application/json',
  },
}

export const options = {
  scenarios: {
    health_steady: {
      executor: 'constant-arrival-rate',
      exec: 'healthScenario',
      rate: 8,
      timeUnit: '1s',
      duration: '2m',
      preAllocatedVUs: 10,
      maxVUs: 20,
    },
    auth_login_peak: {
      executor: 'ramping-arrival-rate',
      exec: 'authLoginScenario',
      startRate: 2,
      timeUnit: '1s',
      preAllocatedVUs: 10,
      maxVUs: 40,
      stages: [
        { target: 6, duration: '30s' },
        { target: 12, duration: '1m' },
        { target: 2, duration: '30s' },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.03'],
    'http_req_duration{scenario:health_steady}': ['p(95)<350', 'p(99)<700'],
    'http_req_duration{scenario:auth_login_peak}': ['p(95)<900', 'p(99)<1500'],
    checks: ['rate>0.99'],
    health_duration: ['p(95)<350'],
    auth_login_duration: ['p(95)<900'],
  },
}

export function healthScenario() {
  const response = http.get(`${baseUrl}/api/v1/health`)
  healthDuration.add(response.timings.duration)

  check(response, {
    'health returns 200': (r) => r.status === 200,
    'health payload has status': (r) => r.body.includes('"status"'),
  })

  sleep(0.2)
}

export function authLoginScenario() {
  const response = http.post(`${baseUrl}/api/v1/auth/login`, loginPayload, jsonHeaders)
  authLoginDuration.add(response.timings.duration)

  check(response, {
    'auth endpoint deterministic status': (r) => [200, 201, 401, 403, 429].includes(r.status),
    'auth login respects latency budget': (r) => r.timings.duration < 1500,
  })

  sleep(0.4)
}
