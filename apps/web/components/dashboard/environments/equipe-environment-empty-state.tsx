import { LabFactPill, LabPanel, LabSignalRow, LabStatusPill } from '@/components/design-lab/lab-primitives'
import { formatCurrency } from '@/lib/currency'
import type { EquipeCurrency } from './equipe-environment.types'

export function EquipeEmptyState({
  currency,
  totalPayout,
  totalRevenue,
}: Readonly<{
  currency: EquipeCurrency
  totalPayout: number
  totalRevenue: number
}>) {
  return (
    <>
      <EmptyStateMainPanel currency={currency} totalPayout={totalPayout} totalRevenue={totalRevenue} />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
        <EmptyStateUnlockPanel />
        <EmptyStateReadingPanel />
      </div>
    </>
  )
}

function EmptyStateMainPanel({
  currency,
  totalPayout,
  totalRevenue,
}: Readonly<{
  currency: EquipeCurrency
  totalPayout: number
  totalRevenue: number
}>) {
  return (
    <LabPanel
      action={<LabStatusPill tone="warning">aguardando equipe</LabStatusPill>}
      padding="md"
      title="Equipe ainda não configurada"
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
        <EmptyStatePrimaryContent currency={currency} totalPayout={totalPayout} totalRevenue={totalRevenue} />
        <EmptyStateChecklist />
      </div>
    </LabPanel>
  )
}

function EmptyStatePrimaryContent({
  currency,
  totalPayout,
  totalRevenue,
}: Readonly<{
  currency: EquipeCurrency
  totalPayout: number
  totalRevenue: number
}>) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="text-lg font-semibold text-[var(--lab-fg)]">Sem colaboradores ativos no workspace</p>
        <p className="max-w-2xl text-sm leading-6 text-[var(--lab-fg-soft)]">
          Cadastre ou reative colaboradores para liberar ranking, leitura por pessoa, cobertura de acesso e ponte direta
          com a folha.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <LabFactPill label="ativos" value="0" />
        <LabFactPill label="receita" value={formatCurrency(totalRevenue, currency)} />
        <LabFactPill label="folha" value={formatCurrency(totalPayout, currency)} />
        <LabFactPill label="acesso" value="0/0" />
      </div>
      <div className="space-y-0">
        <LabSignalRow
          label="desempenho por pessoa"
          note="receita, pedidos e ticket médio aparecem assim que houver ao menos um colaborador ativo"
          tone="neutral"
          value="travado"
        />
        <LabSignalRow
          label="ponte com a folha"
          note="salário base, comissão e pagamento estimado nascem da mesma base da equipe"
          tone="info"
          value="aguardando base"
        />
        <LabSignalRow
          label="diretório operacional"
          note="a lista volta com status, acesso e pagamento estimado por pessoa"
          tone="neutral"
          value="sem leitura"
        />
      </div>
    </div>
  )
}

function EmptyStateChecklist() {
  return (
    <div className="space-y-0">
      <LabSignalRow
        label="cadastro base"
        note="nome, código e status precisam existir antes de qualquer leitura comercial"
        tone="warning"
        value="pendente"
      />
      <LabSignalRow
        label="salário base"
        note="a folha começa a ficar útil assim que o valor inicial estiver definido"
        tone="neutral"
        value="pendente"
      />
      <LabSignalRow
        label="acesso web"
        note="habilite login só para quem realmente precisa entrar no desktop"
        tone="neutral"
        value="pendente"
      />
      <LabSignalRow
        label="comissão"
        note="o percentual entra só quando fizer sentido para a rotina comercial"
        tone="neutral"
        value="opcional"
      />
    </div>
  )
}

function EmptyStateUnlockPanel() {
  return (
    <LabPanel
      action={<LabStatusPill tone="info">ao ativar</LabStatusPill>}
      padding="md"
      title="O que a equipe destrava"
    >
      <div className="space-y-0">
        <LabSignalRow
          label="ranking comercial"
          note="ordena quem mais vende, quantos pedidos puxou e qual ticket sustenta o período"
          tone="success"
          value="sim"
        />
        <LabSignalRow
          label="status de acesso"
          note="mostra quem já entra no sistema e quem ainda depende de habilitação"
          tone="info"
          value="sim"
        />
        <LabSignalRow
          label="folha da equipe"
          note="salários, comissões e pagamento estimado voltam a nascer da mesma base"
          tone="neutral"
          value="sim"
        />
        <LabSignalRow
          label="perfil individual"
          note="o detalhamento por colaborador reaparece com lucro, receita e pagamento estimado"
          tone="warning"
          value="sim"
        />
      </div>
    </LabPanel>
  )
}

function EmptyStateReadingPanel() {
  return (
    <LabPanel action={<LabStatusPill tone="neutral">0 ativos</LabStatusPill>} padding="md" title="Leitura inicial">
      <div className="flex flex-wrap gap-2">
        <LabFactPill label="líder" value="sem leitura" />
        <LabFactPill label="ticket" value="—" />
        <LabFactPill label="comissão" value="R$ 0,00" />
      </div>
      <div className="mt-5 space-y-0">
        <LabSignalRow
          label="primeiro passo"
          note="trazer ao menos um colaborador ativo já libera a leitura estrutural da equipe"
          tone="info"
          value="cadastrar equipe"
        />
        <LabSignalRow
          label="segunda camada"
          note="depois entram acesso, salário base e regras de comissão"
          tone="neutral"
          value="configurar"
        />
      </div>
    </LabPanel>
  )
}
