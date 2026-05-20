#!/usr/bin/env node

import process from 'node:process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const prisma = new PrismaClient()

const PACKAGED_PRODUCT_KEYWORDS = [
  'agua',
  'beer',
  'cerveja',
  'energetico',
  'garrafa',
  'lata',
  'litrao',
  'long neck',
  'refrigerante',
  'suco',
]

const ISSUE_LABELS = {
  'catalog-photo': 'foto de catalogo',
  'custom-or-manual-photo': 'foto manual/customizada',
  'generic-pexels-on-packaged-good': 'pexels generico em produto embalado',
  'missing-packaged-photo': 'produto embalado sem foto real',
  'missing-photo': 'produto sem foto',
  'pexels-illustrative': 'pexels ilustrativo',
}

loadEnv()

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const products = await readProducts(options.limit)
  const audit = buildAudit(products)

  if (options.json) {
    console.log(JSON.stringify(audit, null, 2))
    return
  }

  printAudit(audit)
}

function parseArgs(args) {
  return {
    json: args.includes('--json'),
    limit: readNumericArg(args, '--limit') ?? 500,
  }
}

function readNumericArg(args, name) {
  const index = args.indexOf(name)
  if (index < 0) {
    return null
  }

  const value = Number(args[index + 1])
  return Number.isFinite(value) && value > 0 ? value : null
}

function loadEnv() {
  dotenv.config({ path: path.join(repoRoot, '.env'), quiet: true })
  dotenv.config({ path: path.join(repoRoot, 'apps', 'api', '.env'), quiet: true })
}

async function readProducts(limit) {
  return prisma.product.findMany({
    select: {
      brand: true,
      catalogSource: true,
      category: true,
      id: true,
      imageUrl: true,
      name: true,
      packagingClass: true,
      quantityLabel: true,
    },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
    take: limit,
  })
}

function buildAudit(products) {
  const rows = products.map(toAuditRow)
  const counts = countByIssue(rows)

  return {
    counts,
    generatedAt: new Date().toISOString(),
    recommendations: buildRecommendations(counts),
    rows,
    total: products.length,
  }
}

function toAuditRow(product) {
  const issue = classifyProductImage(product)

  return {
    brand: product.brand,
    catalogSource: product.catalogSource,
    category: product.category,
    issue,
    issueLabel: ISSUE_LABELS[issue],
    name: product.name,
  }
}

function classifyProductImage(product) {
  if (!hasImage(product.imageUrl)) {
    return isPackagedProduct(product) ? 'missing-packaged-photo' : 'missing-photo'
  }

  if (isOpenFoodFactsUrl(product.imageUrl)) {
    return 'catalog-photo'
  }

  if (isPexelsUrl(product.imageUrl) && isPackagedProduct(product)) {
    return 'generic-pexels-on-packaged-good'
  }

  return isPexelsUrl(product.imageUrl) ? 'pexels-illustrative' : 'custom-or-manual-photo'
}

function buildRecommendations(counts) {
  const recommendations = []

  if (counts['missing-packaged-photo']) {
    recommendations.push(
      'Priorizar barcode/OpenFoodFacts ou foto manual para produtos embalados; nao usar Pexels generico.',
    )
  }

  if (counts['generic-pexels-on-packaged-good']) {
    recommendations.push('Revisar produtos embalados com Pexels: trocar por foto real de embalagem ou remover imagem.')
  }

  if (counts['missing-photo']) {
    recommendations.push('Separar alimentos/preparo de bebidas embaladas antes de buscar imagens ilustrativas.')
  }

  return recommendations
}

function countByIssue(rows) {
  return rows.reduce((counts, row) => {
    counts[row.issue] = (counts[row.issue] ?? 0) + 1
    return counts
  }, {})
}

function printAudit(audit) {
  console.log(`Product image audit: ${audit.total} produtos`)
  console.log('')
  for (const [issue, count] of Object.entries(audit.counts)) {
    console.log(`- ${ISSUE_LABELS[issue] ?? issue}: ${count}`)
  }

  console.log('')
  console.log('Amostra critica:')
  audit.rows
    .filter((row) => row.issue !== 'catalog-photo')
    .slice(0, 20)
    .forEach((row) => console.log(`- ${row.name} | ${row.category} | ${row.issueLabel}`))

  if (audit.recommendations.length > 0) {
    console.log('')
    console.log('Recomendacoes:')
    audit.recommendations.forEach((item) => console.log(`- ${item}`))
  }
}

function hasImage(value) {
  return Boolean(String(value ?? '').trim())
}

function isPexelsUrl(value) {
  return String(value ?? '').includes('images.pexels.com')
}

function isOpenFoodFactsUrl(value) {
  return String(value ?? '').includes('openfoodfacts')
}

function isPackagedProduct(product) {
  const haystack = normalize(
    `${product.name} ${product.brand ?? ''} ${product.category ?? ''} ${product.packagingClass ?? ''} ${product.quantityLabel ?? ''}`,
  )
  return PACKAGED_PRODUCT_KEYWORDS.some((keyword) => haystack.includes(normalize(keyword)))
}

function normalize(value) {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
