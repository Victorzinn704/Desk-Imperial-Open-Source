'use client'

import { useState } from 'react'
import { Boxes, Tags } from 'lucide-react'
import type { ProductImportResponse, ProductRecord } from '@contracts/contracts'
import { ApiError } from '@/lib/api'
import { formatCurrency } from '@/lib/currency'
import { downloadPortfolioCsv, downloadProductTemplateCsv } from '@/lib/portfolio-csv'
import type { ProductFormValues } from '@/lib/validation'
import { useDashboardQueries } from '@/components/dashboard/hooks/useDashboardQueries'
import { useDashboardMutations } from '@/components/dashboard/hooks/useDashboardMutations'
import { DashboardSectionHeading } from '@/components/dashboard/dashboard-section-heading'
import { ProductCard } from '@/components/dashboard/product-card'
import { ProductForm } from '@/components/dashboard/product-form'
import { ProductImportCard } from '@/components/dashboard/product-import-card'
import { ProductSearchField } from '@/components/dashboard/product-search-field'

function MiniCategoryCard({
  category,
  profit,
  subtitle,
}: Readonly<{ category: string; profit: string; subtitle: string }>) {
  return (
    <div className="imperial-card-soft p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-medium text-[var(--text-primary)]">{category}</p>
          <p className="mt-1 text-sm text-[var(--text-soft)]">{subtitle}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-[var(--text-primary)]">{profit}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">lucro potencial</p>
        </div>
      </div>
    </div>
  )
}

export function PortfolioEnvironment() {
  const [editingProduct, setEditingProduct] = useState<ProductRecord | null>(null)
  const [lastImport, setLastImport] = useState<ProductImportResponse | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const { financeQuery, productsQuery } = useDashboardQueries()
  const {
    createProductMutation: _createProductMutation,
    updateProductMutation: _updateProductMutation,
    archiveProductMutation: _archiveProductMutation,
    restoreProductMutation,
    importProductsMutation: _importProductsMutation,
  } = useDashboardMutations()

  const finance = financeQuery.data
  const products = productsQuery.data?.items ?? []
  const productsTotals = productsQuery.data?.totals
  const productsError = productsQuery.error instanceof ApiError ? productsQuery.error.message : null
  const productMutationError = [
    _createProductMutation.error,
    _updateProductMutation.error,
    _archiveProductMutation.error,
    restoreProductMutation.error,
  ].find((error) => error instanceof ApiError)
  const importMutationError =
    _importProductsMutation.error instanceof ApiError ? _importProductsMutation.error.message : null

  const archiveProductMutation = {
    isPending: _archiveProductMutation.isPending,
    mutate: (id: string) =>
      _archiveProductMutation.mutate(id, { onSuccess: () => setEditingProduct(null) }),
  }

  const updateProductMutation = {
    isPending: _updateProductMutation.isPending,
    mutate: (payload: Parameters<typeof _updateProductMutation.mutate>[0]) =>
      _updateProductMutation.mutate(payload, { onSuccess: () => setEditingProduct(null) }),
  }

  const importProductsMutation = {
    isPending: _importProductsMutation.isPending,
    mutate: (file: File) =>
      _importProductsMutation.mutate(file, { onSuccess: (payload) => setLastImport(payload) }),
  }

  const handleProductSubmit = (values: ProductFormValues) => {
    const payload = {
      name: values.name,
      brand: values.brand,
      category: values.category,
      packagingClass: values.packagingClass,
      measurementUnit: values.measurementUnit,
      measurementValue: values.measurementValue,
      unitsPerPackage: values.unitsPerPackage,
      description: values.description,
      unitCost: values.unitCost,
      unitPrice: values.unitPrice,
      currency: values.currency,
      stock: values.stock,
    }

    if (editingProduct) {
      updateProductMutation.mutate({ productId: editingProduct.id, values: payload })
      return
    }

    _createProductMutation.mutate(payload)
  }

  const productBusy =
    _createProductMutation.isPending ||
    updateProductMutation.isPending ||
    archiveProductMutation.isPending ||
    restoreProductMutation.isPending

  const normalizedSearch = searchQuery.trim().toLocaleLowerCase('pt-BR')
  const filteredProducts = normalizedSearch
    ? products.filter((product) =>
        [product.name, product.brand ?? '', product.category, product.packagingClass].some((value) => {
          const normalizedValue = value.toLocaleLowerCase('pt-BR')
          return normalizedValue.includes(normalizedSearch) || normalizedValue.startsWith(normalizedSearch)
        }),
      )
    : products

  return (
    <section className="space-y-6">
      <DashboardSectionHeading
        description="O portfólio alimenta estoque, potencial de lucro e o comportamento financeiro do painel."
        eyebrow="Estoque e margem"
        icon={Boxes}
        title="Módulo de portfólio e produtos"
      />

      <section className="imperial-card p-6">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px] xl:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8fffb9]">Localize um produto</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">
              Busque por nome, inicial, marca ou classe de cadastro
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-soft)]">
              A barra abaixo filtra o portfólio em tempo real para voce achar qualquer item sem descer a tela inteira.
            </p>
            <div className="mt-5">
              <ProductSearchField onChange={setSearchQuery} onClear={() => setSearchQuery('')} value={searchQuery} />
            </div>
          </div>

          <div className="imperial-card-soft px-5 py-4 text-sm text-[var(--text-soft)]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8fffb9]">Portfólio filtrado</p>
            <p className="mt-3 text-3xl font-semibold text-white">{filteredProducts.length}</p>
            <p className="mt-2 leading-7">
              {productsTotals
                ? `${productsTotals.totalProducts} produto(s) no total e ${productsTotals.stockUnits} und disponiveis.`
                : 'Carregando produtos cadastrados...'}
            </p>
          </div>
        </div>

        <p className="mt-4 text-sm text-[var(--text-soft)]">
          {filteredProducts.length === products.length
            ? 'Digite apenas o nome, a inicial, a marca ou o tipo da embalagem para localizar um item mais rápido.'
            : `${filteredProducts.length} item(ns) encontrado(s) para "${searchQuery}".`}
        </p>
      </section>

      <div className="grid gap-4 xl:grid-cols-[0.88fr_1.12fr] xl:items-start">
        <div className="space-y-4">
          <ProductForm
            loading={_createProductMutation.isPending || updateProductMutation.isPending}
            onCancelEdit={() => setEditingProduct(null)}
            onSubmit={handleProductSubmit}
            product={editingProduct}
          />

          <ProductImportCard
            error={importMutationError}
            hasProducts={products.length > 0}
            lastImport={lastImport}
            loading={importProductsMutation.isPending}
            onDownloadPortfolio={() => downloadPortfolioCsv(products)}
            onDownloadTemplate={() => downloadProductTemplateCsv()}
            onImport={importProductsMutation.mutate}
          />
        </div>

        <article className="imperial-card p-7">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl border border-[rgba(52,242,127,0.2)] bg-[rgba(52,242,127,0.08)] text-[#36f57c]">
              <Tags className="size-5" />
            </span>
            <div>
              <p className="text-sm text-[var(--text-soft)]">Categorias</p>
              <h2 className="text-xl font-semibold text-white">Registro de fluxo por categoria</h2>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {finance?.categoryBreakdown.length ? (
              finance.categoryBreakdown.map((item) => (
                <MiniCategoryCard
                  category={item.category}
                  key={item.category}
                  profit={formatCurrency(item.potentialProfit, finance.displayCurrency)}
                  subtitle={`${item.products} produto(s), ${item.units} unidade(s) e ${formatCurrency(item.inventorySalesValue, finance.displayCurrency)} em venda potencial`}
                />
              ))
            ) : (
              <p className="imperial-card-soft px-4 py-3 text-sm text-[var(--text-soft)]">
                Cadastre produtos para destravar a leitura por categoria.
              </p>
            )}
          </div>
        </article>
      </div>

      <section className="imperial-card p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8fffb9]">Portfólio</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Produtos cadastrados na operação</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-soft)]">
              Aqui ficam os itens que alimentam o financeiro potencial e as vendas futuras.
            </p>
          </div>

          <div className="imperial-card-stat px-4 py-3 text-sm text-[var(--text-soft)]">
            {productsTotals
              ? `${productsTotals.totalProducts} produto(s), ${productsTotals.activeProducts} ativo(s) e ${productsTotals.stockUnits} und disponiveis`
              : 'Carregando portfólio...'}
          </div>
        </div>

        {productsError ? <p className="mt-5 text-sm text-[var(--danger)]">{productsError}</p> : null}
        {productMutationError ? (
          <p className="mt-5 text-sm text-[var(--danger)]">{productMutationError.message}</p>
        ) : null}

        <div className="mt-8 space-y-4">
          {filteredProducts.length ? (
            filteredProducts.map((product) => (
              <ProductCard
                busy={productBusy}
                key={product.id}
                onArchive={archiveProductMutation.mutate}
                onEdit={setEditingProduct}
                onRestore={restoreProductMutation.mutate}
                product={product}
              />
            ))
          ) : (
            <div className="imperial-card-soft border-dashed px-5 py-12 text-center">
              <p className="text-lg font-semibold text-white">
                {products.length ? 'Nenhum produto bate com a sua busca.' : 'Nenhum produto cadastrado ainda.'}
              </p>
              <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">
                {products.length
                  ? 'Tente outro nome, marca ou inicial para encontrar o item desejado.'
                  : 'Use o formulario acima para criar os primeiros itens do portfólio.'}
              </p>
            </div>
          )}
        </div>
      </section>
    </section>
  )
}
