import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants'
import { CurrentAuth } from '../src/modules/auth/decorators/current-auth.decorator'

describe('CurrentAuth decorator', () => {
  it('extrai auth do request pelo factory do decorator', () => {
    class DemoController {
      handler(@CurrentAuth() _auth: unknown) {
        return _auth
      }
    }

    const routeArgsMetadata =
      Reflect.getMetadata(ROUTE_ARGS_METADATA, DemoController, 'handler') ??
      Reflect.getMetadata(ROUTE_ARGS_METADATA, DemoController.prototype, 'handler')

    const metadataEntry = Object.values(routeArgsMetadata ?? {})[0] as
      | { factory?: (data: unknown, context: any) => unknown }
      | undefined

    expect(metadataEntry?.factory).toBeDefined()

    const result = metadataEntry?.factory?.(undefined, {
      switchToHttp: () => ({
        getRequest: () => ({
          auth: { userId: 'owner-1', role: 'OWNER' },
        }),
      }),
    })

    expect(result).toEqual({ userId: 'owner-1', role: 'OWNER' })
  })
})
