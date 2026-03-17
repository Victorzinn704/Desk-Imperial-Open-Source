import { Injectable } from '@nestjs/common'

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      service: 'desk-imperial-api',
      timestamp: new Date().toISOString(),
    }
  }
}
