'use client'

import { useState } from 'react'
import type { ProductImportResponse } from '@contracts/contracts'
import { ChevronDown, Download, FileSpreadsheet, Upload } from 'lucide-react'
import { Button } from '@/components/shared/button'

export function ProductImportCard({
  error,
  lastImport,
  loading,
  hasProducts,
  onDownloadPortfolio,
  onDownloadTemplate,
  onImport,
}: Readonly<{
  error?: string | null
  lastImport?: ProductImportResponse | null
  loading?: boolean
  hasProducts: boolean
  onDownloadPortfolio: () => void
  onDownloadTemplate: () => void
  onImport: (file: File) => void
}>) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const [showColumns, setShowColumns] = useState(false)

  const handleFileChange = (file: File | null) => {
    setLocalError(null)

    if (!file) {
      setSelectedFile(null)
      return
    }

    const isCsv = file.name.toLowerCase().endsWith('.csv') || file.type.includes('csv')
    if (!isCsv) {
      setSelectedFile(null)
      setLocalError('Selecione um arquivo CSV válido para importar.')
      return
    }

    if (file.size > 256 * 1024) {
      setSelectedFile(null)
      setLocalError('O arquivo excede 256 KB. Divida a importação em partes menores.')
      return
    }

    setSelectedFile(file)
  }

  return (
    <article className="imperial-card p-7">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-2xl border border-[rgba(143,183,255,0.22)] bg-[rgba(143,183,255,0.08)] text-[var(--info)]">
          <FileSpreadsheet className="size-5" />
        </span>
        <div>
          <p className="text-sm text-[var(--text-soft)]">Importação assistida</p>
          <h2 className="text-xl font-semibold text-white">Suba o portfólio por CSV</h2>
        </div>
      </div>

      <p className="mt-4 text-sm leading-7 text-[var(--text-soft)]">
        Começamos pela importação de produtos para destravar a operação real sem cadastro manual
        item por item.
      </p>

      <div className="imperial-card-soft mt-5">
        <button
          className="flex w-full items-center justify-between p-5 text-left"
          type="button"
          onClick={() => setShowColumns((v) => !v)}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
            Colunas esperadas
          </p>
          <ChevronDown
            className={`size-4 text-[var(--text-soft)] transition-transform duration-200 ${showColumns ? 'rotate-180' : ''}`}
          />
        </button>

        {showColumns && (
          <div className="space-y-4 px-5 pb-5">
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                { col: 'name', note: 'Nome do produto', required: true },
                { col: 'brand', note: 'Marca — opcional', required: false },
                { col: 'category', note: 'Categoria', required: true },
                { col: 'currency', note: 'BRL, USD ou EUR', required: true },
                { col: 'unitCost', note: 'Custo unitário', required: true },
                { col: 'unitPrice', note: 'Preço de venda', required: true },
                { col: 'description', note: 'Descrição livre', required: true },
                { col: 'packagingClass', note: 'Usa UN se omitido', required: false },
                { col: 'measurementUnit', note: 'Usa UN se omitido', required: false },
                { col: 'measurementValue', note: 'Usa UN se omitido', required: false },
                { col: 'unitsPerPackage', note: 'Usa UN se omitido', required: false },
                { col: 'stockPackages', note: 'Recomendado p/ estoque', required: false },
                { col: 'stockLooseUnits', note: 'Recomendado p/ estoque', required: false },
                { col: 'stock', note: 'Total em unidades — legado', required: false },
              ].map(({ col, note, required }) => (
                <div
                  key={col}
                  className="flex items-center gap-3 rounded-xl border border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.02)] px-3 py-2"
                >
                  <code className="shrink-0 rounded-md bg-[rgba(143,183,255,0.1)] px-2 py-0.5 text-xs font-bold text-[var(--info)]">
                    {col}
                  </code>
                  <span className="min-w-0 flex-1 truncate text-xs text-[var(--text-soft)]">{note}</span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      required
                        ? 'bg-[rgba(52,242,127,0.1)] text-[#36f57c]'
                        : 'bg-[rgba(255,255,255,0.05)] text-[var(--text-soft)]'
                    }`}
                  >
                    {required ? 'obrig.' : 'opc.'}
                  </span>
                </div>
              ))}
            </div>

            <p className="text-xs leading-6 text-[var(--text-soft)]">
              Prefira <code className="rounded bg-[rgba(143,183,255,0.1)] px-1 text-[var(--info)]">stockPackages</code> +{' '}
              <code className="rounded bg-[rgba(143,183,255,0.1)] px-1 text-[var(--info)]">stockLooseUnits</code> para controle por embalagem.{' '}
              <code className="rounded bg-[rgba(143,183,255,0.1)] px-1 text-[var(--info)]">stock</code> aceita o total em unidades para compatibilidade.
            </p>
          </div>
        )}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Button fullWidth onClick={onDownloadTemplate} type="button" variant="secondary">
          <Download className="size-4" />
          Baixar modelo CSV
        </Button>
        <Button
          disabled={!hasProducts}
          fullWidth
          onClick={onDownloadPortfolio}
          type="button"
          variant="ghost"
        >
          <Download className="size-4" />
          Exportar portfólio atual
        </Button>
      </div>

      <label className="imperial-card-soft mt-5 flex cursor-pointer flex-col items-center justify-center border-dashed px-5 py-8 text-center transition hover:border-[var(--accent)] hover:bg-[rgba(212,177,106,0.06)]">
        <Upload className="size-6 text-[var(--accent)]" />
        <span className="mt-3 text-sm font-medium text-white">
          {selectedFile ? selectedFile.name : 'Escolha um arquivo CSV'}
        </span>
        <span className="mt-2 text-sm text-[var(--text-soft)]">
          O arquivo é lido localmente e enviado para validação da API.
        </span>
        <input
          accept=".csv,text/csv"
          className="hidden"
          onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
          type="file"
        />
      </label>

      {localError ? <p className="mt-4 text-sm text-[var(--danger)]">{localError}</p> : null}
      {error ? <p className="mt-4 text-sm text-[var(--danger)]">{error}</p> : null}

      <Button
        className="mt-5"
        disabled={!selectedFile}
        fullWidth
        loading={loading}
        onClick={() => {
          if (!selectedFile) {
            return
          }

          onImport(selectedFile)
          setSelectedFile(null)
        }}
        size="lg"
        type="button"
      >
        Importar produtos
      </Button>

      {lastImport ? (
        <div className="imperial-card-soft mt-5 p-4">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
            Última importação
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <ImportMetric label="Linhas lidas" value={String(lastImport.summary.totalRows)} />
            <ImportMetric label="Criados" value={String(lastImport.summary.createdCount)} />
            <ImportMetric label="Atualizados" value={String(lastImport.summary.updatedCount)} />
            <ImportMetric label="Falhas" value={String(lastImport.summary.failedCount)} />
          </div>

          {lastImport.errors.length ? (
            <div className="mt-4 space-y-2">
              {lastImport.errors.slice(0, 4).map((entry) => (
                <p className="text-sm text-[var(--danger)]" key={`${entry.line}-${entry.message}`}>
                  Linha {entry.line}: {entry.message}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}

function ImportMetric({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="imperial-card-stat px-4 py-3">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  )
}
