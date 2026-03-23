'use client'

import { motion } from 'framer-motion'
import { BrandMark } from '@/components/shared/brand-mark'
import { Quote } from 'lucide-react'

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
}: Readonly<{
  eyebrow: string
  title: string
  description: string
  children: React.ReactNode
}>) {
  return (
    <main className="min-h-screen w-full lg:grid lg:grid-cols-2 bg-background">
      {/* ── Esquerda: Branding & Exclusividade ── */}
      <div className="relative hidden w-full flex-col bg-zinc-950 text-white lg:flex border-r border-border">
        {/* Abstract Background Noise / Gradient */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-[500px] bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.03),transparent_50%)]" />
          <div className="absolute bottom-0 right-0 w-full h-[500px] bg-[radial-gradient(ellipse_at_bottom_right,rgba(255,255,255,0.02),transparent_50%)]" />
          <div 
            className="absolute inset-0 opacity-[0.015]"
            style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\\"0 0 200 200\\" xmlns=\\"http://www.w3.org/2000/svg\\"%3E%3Cfilter id=\\"noiseFilter\\"%3E%3CfeTurbulence type=\\"fractalNoise\\" baseFrequency=\\"0.65\\" numOctaves=\\"3\\" stitchTiles=\\"stitch\\"/%3E%3C/filter%3E%3Crect width=\\"100%25\\" height=\\"100%25\\" filter=\\"url(%23noiseFilter)\\"/%3E%3C/svg%3E")' }}
          />
        </div>

        <div className="relative z-10 flex h-full flex-col p-10 xl:p-14">
          <div className="flex items-center gap-2">
            <BrandMark />
          </div>

          <div className="my-auto max-w-md">
            <h1 className="text-3xl font-medium tracking-tight text-white/90">
              Operação sob demanda.
              <br />
              <span className="text-white/40">Controle em tempo real.</span>
            </h1>
            <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/35">
              {eyebrow}
            </p>
            <p className="mt-6 text-sm leading-6 text-white/50">
              {description} O Desk Imperial eleva a sua gestão comercial combinando
              precisão tática e autoridade.
            </p>
          </div>

          <div className="mt-auto">
            <div className="flex flex-col gap-4">
              <Quote className="size-6 text-white/20" />
              <p className="text-sm font-medium leading-relaxed text-white/70 max-w-sm">
                &ldquo;A excelência operacional não é um diferencial competitivo, é a fundação para escalar modelos de negócio complexos.&rdquo;
              </p>
              <div className="flex items-center gap-3 mt-2 text-xs text-white/40">
                <span className="font-semibold text-white/70">Desk Imperial</span>
                <span>•</span>
                <span>Enterprise Suite</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Direita: Formulário Limpo ── */}
      <div className="flex flex-col flex-1 p-6 md:p-10 lg:p-14 min-h-screen">
        <div className="lg:hidden mb-8">
          <BrandMark />
        </div>
        
        <div className="flex-1 flex flex-col justify-center items-center">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md"
            initial={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <div className="mb-8">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Inicie sua sessão corporativa preenchendo as credenciais vitais abaixo.
              </p>
            </div>

            {/* O children entra limpo, o fundo branco/preto sem card será usado */}
            <div className="w-full">
              {children}
            </div>
            
            <p className="mt-10 text-center text-[11px] text-muted-foreground/60 w-full max-w-sm mx-auto">
              Ao acessar, você atesta compromisso com os guias de uso restrito interno de Governança e Operação.
            </p>
          </motion.div>
        </div>
      </div>
    </main>
  )
}
