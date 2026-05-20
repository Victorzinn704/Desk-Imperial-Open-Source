'use client'

import { BarChart3, Cog, type LucideIcon, Package, Shield } from 'lucide-react'

export type OwnerAccountViewProps = Readonly<{
  companyName: string
  displayName: string
  onOpenDashboard: () => void
  onOpenQuickRegister: () => void
  onOpenSecurity: () => void
  onOpenSettings: () => void
}>

export type OwnerAccountAction = Readonly<{
  accent: string
  description: string
  Icon: LucideIcon
  label: string
  onClick: () => void
}>

export type OwnerAccountGroup = Readonly<{
  description: string
  label: string
  actions: OwnerAccountAction[]
}>

export function buildOwnerAccountTags() {
  return ['proprietário', 'acesso global', 'configuração móvel']
}

export function buildOwnerAccountGroups({
  onOpenDashboard,
  onOpenQuickRegister,
  onOpenSecurity,
  onOpenSettings,
}: Pick<
  OwnerAccountViewProps,
  'onOpenDashboard' | 'onOpenQuickRegister' | 'onOpenSecurity' | 'onOpenSettings'
>): OwnerAccountGroup[] {
  return [buildSystemGroup(onOpenDashboard, onOpenSettings), buildOperationsGroup(onOpenQuickRegister, onOpenSecurity)]
}

function buildSystemGroup(onOpenDashboard: () => void, onOpenSettings: () => void): OwnerAccountGroup {
  return {
    label: 'Sistema',
    description: 'Ajustes do workspace e superfícies mais amplas.',
    actions: [
      {
        accent: '#008cff',
        description: 'Conta, preferências e controles gerais do workspace.',
        Icon: Cog,
        label: 'Configurações',
        onClick: onOpenSettings,
      },
      {
        accent: '#60a5fa',
        description: 'Abrir a superfície desktop com visão integral do sistema.',
        Icon: BarChart3,
        label: 'Painel completo',
        onClick: onOpenDashboard,
      },
    ],
  }
}

function buildOperationsGroup(onOpenQuickRegister: () => void, onOpenSecurity: () => void): OwnerAccountGroup {
  return {
    label: 'Operação',
    description: 'Ferramentas que sustentam o trabalho do balcão e do turno.',
    actions: [
      {
        accent: '#36f57c',
        description: 'Abrir o fluxo de scan de EAN e inclusão operacional no catálogo.',
        Icon: Package,
        label: 'Catálogo e cadastro rápido',
        onClick: onOpenQuickRegister,
      },
      {
        accent: '#fbbf24',
        description: 'Sessão, proteção e parâmetros sensíveis do acesso proprietário.',
        Icon: Shield,
        label: 'Segurança',
        onClick: onOpenSecurity,
      },
    ],
  }
}
