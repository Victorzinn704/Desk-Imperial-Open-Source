import type { CurrencyCode, Prisma } from '@prisma/client'
import { CacheService } from '../../common/services/cache.service'
import { resolveWorkspaceOwnerUserId } from '../../common/utils/workspace-access.util'
import type { AuthContext } from '../auth/auth.types'
import type { ExchangeRatesSnapshot } from '../currency/currency.service'
import type { ListProductsQueryDto } from './dto/list-products.query'
import { buildProductsResponse } from './products-response.mapper'
import { type ProductsServiceDependencies, productWithComboInclude } from './products-service.types'

type ProductListInput = {
  auth: AuthContext
  query: ListProductsQueryDto
}

type ProductListScope = {
  workspaceUserId: string
  includeInactive: boolean | undefined
  limit: number
  cacheKey: string | null
}

export async function listProductsForUser(deps: ProductsServiceDependencies, input: ProductListInput) {
  const scope = resolveProductListScope(input)
  const cached = scope.cacheKey ? await deps.cache.get<ReturnType<typeof buildProductsResponse>>(scope.cacheKey) : null

  if (cached) {
    return cached
  }

  const items = await deps.prisma.product.findMany(buildProductListQuery(scope, input.query))
  const snapshot = await resolveProductsSnapshot(deps, items, input.auth.preferredCurrency)
  const result = buildProductsResponse(items, {
    displayCurrency: input.auth.preferredCurrency,
    currencyService: deps.currencyService,
    snapshot,
    ratesUpdatedAt: snapshot.updatedAt,
  })

  if (scope.cacheKey) {
    void deps.cache.set(scope.cacheKey, result, 300)
  }

  return result
}

function resolveProductListScope({ auth, query }: ProductListInput): ProductListScope {
  const workspaceUserId = resolveWorkspaceOwnerUserId(auth)
  const includeInactive = auth.role === 'OWNER' && query.includeInactive
  const limit = Math.min(query.limit ?? 200, 2000)
  const shouldUseListCache = !(query.category || query.search || query.cursor || query.limit)
  const cacheScope = includeInactive ? 'all' : 'active'

  return {
    workspaceUserId,
    includeInactive,
    limit,
    cacheKey: shouldUseListCache ? CacheService.productsKey(workspaceUserId, cacheScope) : null,
  }
}

function buildProductListQuery(scope: ProductListScope, query: ListProductsQueryDto): Prisma.ProductFindManyArgs {
  return {
    take: scope.limit,
    ...(query.cursor ? { skip: 1, cursor: { id: query.cursor } } : {}),
    include: productWithComboInclude,
    where: buildProductListWhere(scope, query),
    orderBy: scope.includeInactive ? [{ active: 'desc' }, { createdAt: 'desc' }] : [{ createdAt: 'desc' }],
  }
}

function buildProductListWhere(scope: ProductListScope, query: ListProductsQueryDto): Prisma.ProductWhereInput {
  return {
    userId: scope.workspaceUserId,
    ...(scope.includeInactive ? {} : { active: true }),
    ...buildCategoryFilter(query.category),
    ...buildSearchFilter(query.search),
  }
}

function buildCategoryFilter(category: string | undefined): Prisma.ProductWhereInput {
  return category
    ? {
        category: {
          equals: category.trim(),
          mode: 'insensitive',
        },
      }
    : {}
}

function buildSearchFilter(search: string | undefined): Prisma.ProductWhereInput {
  if (!search) {
    return {}
  }

  const value = search.trim()
  return {
    OR: [
      { name: { contains: value, mode: 'insensitive' } },
      { barcode: { contains: value, mode: 'insensitive' } },
      { brand: { contains: value, mode: 'insensitive' } },
      { category: { contains: value, mode: 'insensitive' } },
      { packagingClass: { contains: value, mode: 'insensitive' } },
      { quantityLabel: { contains: value, mode: 'insensitive' } },
      { servingSize: { contains: value, mode: 'insensitive' } },
      { catalogSource: { contains: value, mode: 'insensitive' } },
      { description: { contains: value, mode: 'insensitive' } },
    ],
  }
}

async function resolveProductsSnapshot(
  deps: ProductsServiceDependencies,
  items: Array<{ currency: CurrencyCode }>,
  displayCurrency: CurrencyCode,
): Promise<ExchangeRatesSnapshot> {
  if (items.length === 0 || items.every((item) => item.currency === displayCurrency)) {
    return { updatedAt: null, source: 'live', notice: null, rates: {} }
  }

  return deps.currencyService.getSnapshot()
}
