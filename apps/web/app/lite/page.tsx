import Link from 'next/link'

const TRACKS = [
  {
    href: '/lite/web',
    title: 'Web Lite',
    subtitle: 'Fluxo enxuto para navegador desktop/mobile.',
    accent: '#008cff',
  },
  {
    href: '/lite/pwa',
    title: 'PWA Lite',
    subtitle: 'Experiencia instalavel com foco em uso continuo.',
    accent: '#22c55e',
  },
]

export default function LiteHomePage() {
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="lab-heading">Desk Imperial Lite</h1>
        <p className="lab-subheading">Dois caminhos fortes para a mesma base de operacao.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {TRACKS.map((track) => (
          <article key={track.href} className="lab-card lab-card-p flex flex-col gap-3">
            <div>
              <p className="lab-subheading" style={{ color: track.accent }}>
                {track.title}
              </p>
              <p style={{ color: 'var(--lab-fg-soft)', fontSize: 14, marginTop: 4 }}>{track.subtitle}</p>
            </div>
            <Link
              href={track.href}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: 34,
                borderRadius: 8,
                border: `1px solid ${track.accent}44`,
                background: `${track.accent}22`,
                color: track.accent,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Abrir {track.title}
            </Link>
          </article>
        ))}
      </div>
    </section>
  )
}
