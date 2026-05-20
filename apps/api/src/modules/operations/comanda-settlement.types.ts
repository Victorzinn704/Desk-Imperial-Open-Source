import type { RequestContext } from '../../common/utils/request-context.util'
import type { AuthContext } from '../auth/auth.types'
import type { OperationsResponseOptionsDto } from './operations.schemas'

export type ComandaSettlementMutationArgs<TDto> = {
  auth: AuthContext
  comandaId: string
  context: RequestContext
  dto: TDto
  options?: OperationsResponseOptionsDto | undefined
}
