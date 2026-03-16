'use client'

import { useState } from 'react'
import type { ProductImportResponse } from '@contracts/contracts'
import { Download, FileSpreadsheet, Upload } from 'lucide-react'
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

  const handleFileChange = (file: File | null) => {
    setLocalError(null)

    if (!file) {
      setSelectedFile(null)
      return
    }

    const isCsv = file.name.toLowerCase().endsWith('.csv') || file.type.includes('csv')
    if (!isCsv) {
      setSelectedFile(null)
      setLocalError('Selecione um arquivo CSV valido para importar.')
      return
    }

    if (file.size > 256 * 1024) {
      setSelectedFile(null)
      setLocalError('O arquivo excede 256 KB. Divida a importacao em partes menores.')
      return
    }

    setSelectedFile(file)
  }

  return (
    <article className="rounded-[32px] border border-[rgba(255,255,255,0.08)] bg-[var(--surface)] p-7 shadow-[var(--shadow-panel)]">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-2xl border border-[rgba(143,183,255,0.22)] bg-[rgba(143,183,255,0.08)] text-[var(--info)]">
          <FileSpreadsheet className="size-5" />
        </span>
        <div>
          <p className="text-sm text-[var(--text-soft)]">Importacao assistida</p>
          <h2 className="text-xl font-semibold text-white">Suba o portfolio por CSV</h2>
        </div>
      </div>

      <p className="mt-4 text-sm leading-7 text-[var(--text-soft)]">
        Comecamos pela importacao de produtos para destravar operacao real sem cadastro manual
        item por item.
      </p>

      <div className="mt-5 rounded-[24px] border border-[var(--border)] bg-[var(--surface-soft)] p-4 text-sm text-[var(--text-soft)]">
        <p className="font-medium text-white">Colunas esperadas</p>
        <p className="mt-2">
          `name`, `brand`, `category`, `packagingClass`, `measurementUnit`, `measurementValue`,
          `unitsPerPackage`, `description`, `unitCost`, `unitPrice`, `stockPackages`,
          `stockLooseUnits`, `stock`, `currency`
        </p>
        <p className="mt-2 text-xs text-[var(--text-soft)]">
          `brand` e opcional. Se `packagingClass`, `measurementUnit`, `measurementValue` ou
          `unitsPerPackage` nao forem enviados, o sistema usa um cadastro rapido com `UN`.
          `stockPackages` e `stockLooseUnits` sao o formato recomendado; `stock` continua como
          compatibilidade para total em unidades.
        </p>
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
          Exportar portfolio atual
        </Button>
      </div>

      <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed border-[var(--border-strong)] bg-[rgba(255,255,255,0.02)] px-5 py-8 text-center transition hover:border-[var(--accent)] hover:bg-[rgba(212,177,106,0.06)]">
        <Upload className="size-6 text-[var(--accent)]" />
        <span className="mt-3 text-sm font-medium text-white">
          {selectedFile ? selectedFile.name : 'Escolha um arquivo CSV'}
        </span>
        <span className="mt-2 text-sm text-[var(--text-soft)]">
          O arquivo e lido localmente e enviado para validacao da API.
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
        <div className="mt-5 rounded-[24px] border border-[var(--border)] bg-[var(--surface-soft)] p-4">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
            Ultima importacao
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
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  )
}
