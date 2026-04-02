'use client'

import { Github, Linkedin } from 'lucide-react'

const socialLinks = [
  {
    label: 'LinkedIn',
    handle: 'joao-victor-530060259',
    href: 'https://www.linkedin.com/in/jo%C3%A3o-victor-530060259/',
    icon: Linkedin,
    glow: 'from-[#0A66C2]/35 to-[#0A66C2]/5',
  },
  {
    label: 'GitHub',
    handle: 'Victorzinn704',
    href: 'https://github.com/Victorzinn704',
    icon: Github,
    glow: 'from-white/20 to-white/5',
  },
] as const

export function FounderContactCard() {
  return (
    <aside className="relative z-20 mx-4 mt-[-1.4rem] rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(7,7,8,0.72)] p-4 backdrop-blur-xl lg:mx-0 lg:ml-auto lg:mr-8 lg:mt-[-4.8rem] lg:w-[340px]">
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_top,rgba(155,132,96,0.22),transparent_62%)]" />

      <div className="relative">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">Contato do fundador</p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">Joao Victor de Moraes da Cruz</p>
            <p className="text-xs text-[var(--text-soft)]">Saquarema, RJ | Open Source Builder</p>
          </div>
          <span className="rounded-full border border-[rgba(155,132,96,0.35)] bg-[rgba(155,132,96,0.14)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
            Connect
          </span>
        </div>

        <ul className="mt-4 grid grid-cols-2 gap-3">
          {socialLinks.map((social) => {
            const Icon = social.icon

            return (
              <li className="group relative" key={social.label}>
                <a
                  aria-label={social.label}
                  className="block"
                  href={social.href}
                  rel="noreferrer"
                  target="_blank"
                >
                  <span
                    className={`absolute inset-0 rounded-xl bg-gradient-to-br ${social.glow} opacity-50 blur-md transition duration-300 group-hover:opacity-90 group-hover:blur-lg`}
                  />
                  <span className="relative flex h-[66px] items-center gap-2 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(14,14,15,0.9)] px-3 transition duration-300 group-hover:-translate-y-1 group-hover:border-[rgba(255,255,255,0.2)] group-hover:bg-[rgba(20,20,22,0.95)]">
                    <span className="inline-flex size-9 items-center justify-center rounded-[10px] border border-[rgba(255,255,255,0.12)] bg-black/30 text-[var(--accent)]">
                      <Icon className="size-4" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-white">{social.label}</span>
                      <span className="block text-xs text-[var(--text-soft)]">@{social.handle}</span>
                    </span>
                  </span>
                </a>

                <div className="pointer-events-none absolute left-1/2 top-0 z-30 w-[200px] -translate-x-1/2 -translate-y-[95%] rounded-xl border border-[rgba(255,255,255,0.1)] bg-[rgba(10,10,11,0.95)] p-3 opacity-0 shadow-[0_18px_38px_rgba(0,0,0,0.42)] blur-sm transition duration-300 group-hover:-translate-y-[112%] group-hover:opacity-100 group-hover:blur-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">{social.label}</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--text-soft)]">Clique para abrir o perfil oficial.</p>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </aside>
  )
}