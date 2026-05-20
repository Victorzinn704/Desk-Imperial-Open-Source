import { currencyOptions } from '@/lib/currency'
import { Button } from '@/components/shared/button'
import { InputField } from '@/components/shared/input-field'
import { SelectField } from '@/components/shared/select-field'
import { BuyerHeader, OperationHeader } from './order-form-headings'
import { OrderBuyerAddressFields, OrderBuyerIdentityFields } from './order-form-buyer-fields'
import type { FieldErrors, UseFormRegister } from 'react-hook-form'
import type { OrderFormInputValues, OrderFormValues } from '@/lib/validation'
import type { EmployeeRecord } from '@/lib/api'

export function OrderFormIntro() {
  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">Pedido multi-item</p>
      <h2 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">
        Monte a venda como um carrinho de mercado.
      </h2>
      <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">
        Organizei a operação em etapas para deixar o preenchimento mais claro: primeiro o carrinho, depois a
        configuração da venda e por fim os dados do comprador.
      </p>
    </div>
  )
}

type RegisterShape = UseFormRegister<OrderFormInputValues>
type ErrorShape = FieldErrors<OrderFormInputValues>

export function OrderOperationSection(
  props: Readonly<{
    activeEmployees: EmployeeRecord[]
    employeeOptions: Array<{ label: string; value: string }>
    errors: ErrorShape
    isEmbedded: boolean
    isStaffUser: boolean
    register: RegisterShape
  }>,
) {
  return (
    <section
      className={
        props.isEmbedded ? 'space-y-5 border-t border-dashed border-[var(--border)] pt-6' : 'imperial-card-soft p-5'
      }
    >
      <OrderOperationHeader isEmbedded={props.isEmbedded} />
      <OrderOperationGrid {...props} />
    </section>
  )
}

export function OrderBuyerSection(
  props: Readonly<{
    buyerType: OrderFormValues['buyerType']
    errors: ErrorShape
    isEmbedded: boolean
    register: RegisterShape
    documentLabel: string
    documentPlaceholder: string
  }>,
) {
  return (
    <section
      className={
        props.isEmbedded ? 'space-y-5 border-t border-dashed border-[var(--border)] pt-6' : 'imperial-card-soft p-5'
      }
    >
      <OrderBuyerHeader isEmbedded={props.isEmbedded} />
      <OrderBuyerGrid {...props} />
    </section>
  )
}

export function OrderFormSubmitBar(
  props: Readonly<{ disabled: boolean; isEmbedded: boolean; loading?: boolean; submitLabel: string }>,
) {
  if (props.isEmbedded) {
    return (
      <div className="flex justify-end border-t border-dashed border-[var(--border)] pt-6">
        <Button disabled={props.disabled} loading={props.loading} size="lg" type="submit">
          {props.submitLabel}
        </Button>
      </div>
    )
  }

  return (
    <Button fullWidth disabled={props.disabled} loading={props.loading} size="lg" type="submit">
      {props.submitLabel}
    </Button>
  )
}

export function EmbeddedSectionHeader(props: Readonly<{ description: string; eyebrow: string; title: string }>) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">{props.eyebrow}</p>
      <h3 className="text-lg font-semibold text-[var(--text-primary)]">{props.title}</h3>
      <p className="text-sm leading-6 text-[var(--text-soft)]">{props.description}</p>
    </div>
  )
}

export function InlineFact(props: Readonly<{ label: string; value: string }>) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--text-soft)]">
      <span className="uppercase tracking-[0.14em] text-[var(--text-muted)]">{props.label}</span>
      <span className="font-medium text-[var(--text-primary)]">{props.value}</span>
    </div>
  )
}

export function MiniInfo(props: Readonly<{ label: string; value: string }>) {
  return (
    <div className="imperial-card-stat px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">{props.label}</p>
      <p className="mt-2 text-xl font-semibold text-[var(--text-primary)]">{props.value}</p>
    </div>
  )
}

function OrderOperationHeader({ isEmbedded }: Readonly<{ isEmbedded: boolean }>) {
  return isEmbedded ? (
    <EmbeddedSectionHeader
      description="Moeda, responsável e canal ficam no mesmo bloco, sem desviar a leitura."
      eyebrow="Operação"
      title="Contexto da venda"
    />
  ) : (
    <OperationHeader />
  )
}

function OrderOperationGrid(
  props: Readonly<{
    activeEmployees: EmployeeRecord[]
    employeeOptions: Array<{ label: string; value: string }>
    errors: ErrorShape
    isEmbedded: boolean
    isStaffUser: boolean
    register: RegisterShape
  }>,
) {
  return (
    <>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <SelectField
          error={props.errors.currency?.message}
          label="Moeda da venda"
          options={currencyOptions}
          {...props.register('currency')}
        />
        {props.isStaffUser ? (
          <StaffOwnershipNote isEmbedded={props.isEmbedded} />
        ) : (
          <OwnerEmployeeField
            activeEmployeesLength={props.activeEmployees.length}
            employeeOptions={props.employeeOptions}
            error={props.errors.sellerEmployeeId?.message}
            register={props.register}
          />
        )}
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <InputField
          error={props.errors.channel?.message}
          label="Canal"
          placeholder="Marketplace"
          {...props.register('channel')}
        />
        <InputField
          error={props.errors.notes?.message}
          hint="Campo opcional para observações rápidas do pedido."
          label="Observações"
          placeholder="Entrega rápida, pedido via app."
          {...props.register('notes')}
        />
      </div>
    </>
  )
}

function OrderBuyerHeader({ isEmbedded }: Readonly<{ isEmbedded: boolean }>) {
  return isEmbedded ? (
    <EmbeddedSectionHeader
      description="Os campos de comprador e localização continuam vivos, mas em um bloco mais objetivo."
      eyebrow="Comprador"
      title="Identificação e localização"
    />
  ) : (
    <BuyerHeader />
  )
}

function OrderBuyerGrid(
  props: Readonly<{
    buyerType: OrderFormValues['buyerType']
    documentLabel: string
    documentPlaceholder: string
    errors: ErrorShape
    register: RegisterShape
  }>,
) {
  return (
    <>
      <OrderBuyerIdentityFields
        buyerType={props.buyerType}
        documentLabel={props.documentLabel}
        documentPlaceholder={props.documentPlaceholder}
        errors={props.errors}
        register={props.register}
      />
      <OrderBuyerAddressFields errors={props.errors} register={props.register} />
    </>
  )
}

function StaffOwnershipNote({ isEmbedded }: Readonly<{ isEmbedded: boolean }>) {
  return (
    <div className={isEmbedded ? 'border-t border-dashed border-[var(--border)] pt-4' : 'imperial-card-stat px-4 py-3'}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">
        Responsável pela venda
      </p>
      <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">Seu acesso será vinculado automaticamente.</p>
      <p className="mt-2 text-xs leading-6 text-[var(--text-soft)]">
        O sistema grava sua autoria em tempo real para auditoria da empresa.
      </p>
    </div>
  )
}

function OwnerEmployeeField(
  props: Readonly<{
    activeEmployeesLength: number
    employeeOptions: Array<{ label: string; value: string }>
    error?: string
    register: RegisterShape
  }>,
) {
  return (
    <SelectField
      error={props.error}
      hint={
        props.activeEmployeesLength > 0
          ? 'A venda alimenta ranking, ticket médio e desempenho individual.'
          : 'Cadastre pelo menos um funcionário ativo para atribuir vendas.'
      }
      label="Funcionário responsável"
      options={props.employeeOptions}
      {...props.register('sellerEmployeeId')}
    />
  )
}
