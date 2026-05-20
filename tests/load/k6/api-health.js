import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  vus: 10,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800'],
  },
}

const baseUrl = __ENV.BASE_URL || 'http://localhost:4000'

export default function () {
  const response = http.get(`${baseUrl}/api/v1/health`)

  check(response, {
    'health responded 200': (r) => r.status === 200,
    'health body contains status': (r) => r.body.includes('"status"'),
  })

  sleep(1)
}
