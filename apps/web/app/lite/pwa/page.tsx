import Link from 'next/link'
import { LitePdvKanban } from '@/components/lite/lite-pdv-kanban'

const tabBaseStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: 32,
  padding: '0 12px',
  borderRadius: 8,
  border: '1px solid var(--lab-border)',
  color: 'var(--lab-fg-soft)',
  fontSize: 12,
  fontWeight: 600,
} as const

const tabActiveStyle = {
  border: '1px solid var(--lab-blue-border)',
  background: 'var(--lab-blue-soft)',
  color: 'var(--lab-blue)',
} as const

export default function LitePwaPage() {
  return (
    <section className="space-y-4">
      <nav className="flex flex-wrap items-center gap-2">
        <Link href="/lite" style={tabBaseStyle}>
          Hub Lite
        </Link>
        <Link href="/lite/web" style={tabBaseStyle}>
          Web Lite
        </Link>
        <Link href="/lite/pwa" style={{ ...tabBaseStyle, ...tabActiveStyle }}>
          PWA Lite
        </Link>
      </nav>

      <div
        className="rounded-[10px] border px-3 py-2 text-xs"
        style={{
          borderColor: 'var(--lab-blue-border)',
          background: 'var(--lab-blue-soft)',
          color: 'var(--lab-blue)',
        }}
      >
        Dica: abra o menu do navegador e escolha &quot;Instalar app&quot; para usar a versao PWA Lite.
      </div>

      <LitePdvKanban mode="pwa" title="PDV Lite - PWA" />
    </section>
  )
}
