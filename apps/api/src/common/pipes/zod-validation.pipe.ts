import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common'
import type { ZodType } from 'zod'

@Injectable()
export class ZodValidationPipe<TSchema extends ZodType> implements PipeTransform<unknown> {
  constructor(private readonly schema: TSchema) {}

  transform(value: unknown) {
    const parsed = this.schema.safeParse(value)

    if (parsed.success) {
      return parsed.data
    }

    throw new BadRequestException(
      parsed.error.issues.map((issue) => {
        if (issue.path.length === 0) {
          return issue.message
        }

        return `${issue.path.join('.')}: ${issue.message}`
      }),
    )
  }
}
