import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  vus: 10,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1200'],
  },
}

const baseUrl = __ENV.BASE_URL || 'http://localhost:3000'

export default function () {
  const response = http.get(`${baseUrl}/login`)

  check(response, {
    'login page responded 200': (r) => r.status === 200,
    'login page contains heading': (r) => r.body.includes('Entre e comande seu comércio'),
  })

  sleep(1)
}
