'use client'

import Link from 'next/link'
import { VerifyEmailForm } from '@/components/auth/verify-email-form'
import { Button } from '@/components/shared/button'
import { BrandMark } from '@/components/shared/brand-mark'

const LOADING_SUBNAV_SKELETONS = ['subnav-1', 'subnav-2', 'subnav-3', 'subnav-4']
const LOADING_STAT_CARDS = ['stat-1', 'stat-2', 'stat-3', 'stat-4']
const LOADING_LIST_ROWS = ['row-1', 'row-2', 'row-3', 'row-4', 'row-5']

export function MobileShellLoadingState({ label }: Readonly<{ label: string }>) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-6 text-center text-sm text-[var(--text-soft)]">
      {label}
    </main>
  )
}

export function LoadingState({ compact = false }: Readonly<{ compact?: boolean }>) {
  return (
    <main className="wireframe-dashboard min-h-screen bg-[var(--bg)] text-[var(--text-primary)] lg:h-[100svh] lg:overflow-hidden">
      <div className="workspace-shell__main lg:h-[100svh] lg:overflow-y-auto">
        <div className="wireframe-header">
          <div className={`wireframe-header__bar ${compact ? 'wireframe-header__bar--compact' : ''}`}>
            <div className="skeleton-shimmer h-10 w-44 rounded-lg" />
            <div className="skeleton-shimmer h-9 w-36 rounded-full" />
          </div>
          <div className="wireframe-header__nav-row">
            <div className="skeleton-shimmer h-9 w-full max-w-3xl rounded-lg" />
            <div className="skeleton-shimmer h-8 w-24 rounded-lg" />
          </div>
          <div className="wireframe-subnav">
            {LOADING_SUBNAV_SKELETONS.map((skeletonId) => (
              <div className="skeleton-shimmer h-9 w-40 rounded-full" key={skeletonId} />
            ))}
          </div>
        </div>

        <div
          className={`mx-auto flex w-full max-w-[1880px] flex-col ${compact ? 'gap-4 px-3 py-4 sm:px-4 lg:px-4 lg:py-4 xl:px-5 xl:py-5' : 'gap-6 px-3 py-5 sm:px-4 lg:px-4 lg:py-5 xl:px-5 xl:py-6'}`}
        >
          <div className="wireframe-page-intro">
            <div>
              <div className="skeleton-shimmer h-8 w-40 rounded-xl" />
              <div className="skeleton-shimmer mt-2 h-4 w-64 rounded-full" />
            </div>
            <div className="skeleton-shimmer h-10 w-52 rounded-lg" />
          </div>

          <div className="workspace-notebook-metrics gap-4">
            {LOADING_STAT_CARDS.map((skeletonId) => (
              <div className="imperial-card-stat p-5" key={skeletonId}>
                <div className="skeleton-shimmer size-11 rounded-2xl" />
                <div className="skeleton-shimmer mt-5 h-3 w-20 rounded-full" />
                <div className="skeleton-shimmer mt-3 h-8 w-28 rounded-xl" />
                <div className="skeleton-shimmer mt-2 h-3 w-16 rounded-full" />
              </div>
            ))}
          </div>

          <div className="workspace-notebook-split workspace-notebook-split--rail-340 gap-4">
            <div className="imperial-card p-6">
              <div className="skeleton-shimmer h-4 w-32 rounded-full" />
              <div className="skeleton-shimmer mt-4 h-[260px] rounded-2xl" />
            </div>
            <div className="imperial-card p-6">
              <div className="skeleton-shimmer h-4 w-28 rounded-full" />
              <div className="mt-4 space-y-3">
                {LOADING_LIST_ROWS.map((skeletonId) => (
                  <div className="skeleton-shimmer h-10 rounded-xl" key={skeletonId} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

export function UnauthorizedState({ message }: Readonly<{ message: string }>) {
  return (
    <main className="min-h-screen bg-[var(--bg)] px-6 py-8 text-[var(--text-primary)]">
      <div className="imperial-card mx-auto max-w-4xl p-8 sm:p-10">
        <BrandMark />
        <p className="mt-12 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">Acesso necessario</p>
        <h1 className="mt-4 text-4xl font-semibold text-[var(--text-primary)]">Sua sessão ainda não está ativa.</h1>
        <p className="mt-4 max-w-2xl text-base leading-8 text-muted-foreground">{message}</p>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row">
          <Link href="/login">
            <Button size="lg">Entrar</Button>
          </Link>
          <Link href="/cadastro">
            <Button size="lg" variant="secondary">
              Criar conta
            </Button>
          </Link>
        </div>
      </div>
    </main>
  )
}

export function EmailVerificationLockState({ email }: Readonly<{ email: string }>) {
  return (
    <main className="min-h-screen bg-[var(--bg)] px-6 py-8 text-[var(--text-primary)]">
      <div className="imperial-card mx-auto max-w-2xl p-8 sm:p-10">
        <BrandMark />
        <p className="mt-10 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
          Confirmacao obrigatoria
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-[var(--text-primary)]">
          Valide seu email para liberar o sistema
        </h1>
        <p className="mt-4 text-base leading-8 text-muted-foreground">
          Por seguranca, o painel so e liberado apos a confirmacao do codigo enviado para o email cadastrado.
        </p>

        <div className="mt-8 rounded-[24px] border border-[rgba(37,99,235,0.2)] bg-[rgba(37,99,235,0.06)] p-4 text-sm text-[var(--text-soft)]">
          Email em validacao: <span className="font-semibold text-[var(--text-primary)]">{email}</span>
        </div>

        <div className="mt-8">
          <VerifyEmailForm email={email} firstAccess={false} successRedirectTo="/dashboard" />
        </div>
      </div>
    </main>
  )
}
