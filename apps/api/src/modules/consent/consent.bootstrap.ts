import { Injectable, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ConsentService } from './consent.service'

@Injectable()
export class ConsentBootstrap implements OnModuleInit {
  constructor(
    private readonly consentService: ConsentService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.consentService.ensureDefaultDocuments(
      this.configService.get<string>('CONSENT_VERSION') ?? '2026.03',
    )
  }
}
