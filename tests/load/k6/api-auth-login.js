import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  vus: 5,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<1200'],
  },
}

const baseUrl = __ENV.BASE_URL || 'http://localhost:4000'
const payload = JSON.stringify({
  loginMode: 'OWNER',
  email: __ENV.LOGIN_EMAIL || 'invalid@example.com',
  password: __ENV.LOGIN_PASSWORD || 'invalid-password',
})

const params = {
  headers: {
    'Content-Type': 'application/json',
  },
}

export default function () {
  const response = http.post(`${baseUrl}/api/v1/auth/login`, payload, params)

  check(response, {
    'login responds deterministically': (r) => [200, 201, 401, 403, 429].includes(r.status),
    'login latency acceptable': (r) => r.timings.duration < 1500,
  })

  sleep(1)
}
