import http from 'k6/http'
import { check, sleep } from 'k6'

const baseUrl = __ENV.BASE_URL || 'http://127.0.0.1:4000'
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
  vus: 6,
  duration: '45s',
  thresholds: {
    http_req_failed: ['rate<0.03'],
    http_req_duration: ['p(95)<900', 'p(99)<1500'],
    checks: ['rate>0.99'],
  },
}

export default function () {
  const healthResponse = http.get(`${baseUrl}/api/health`)
  check(healthResponse, {
    'health returns 200': (response) => response.status === 200,
    'health contains status field': (response) => response.body.includes('"status"'),
  })

  const loginResponse = http.post(`${baseUrl}/api/auth/login`, loginPayload, jsonHeaders)
  check(loginResponse, {
    'auth deterministic status': (response) => [200, 201, 401, 403, 429].includes(response.status),
    'auth latency under 1500ms': (response) => response.timings.duration < 1500,
  })

  sleep(0.4)
}
