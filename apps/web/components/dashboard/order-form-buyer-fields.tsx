import { InputField } from '@/components/shared/input-field'
import { SelectField } from '@/components/shared/select-field'
import type { FieldErrors, UseFormRegister } from 'react-hook-form'
import type { OrderFormInputValues, OrderFormValues } from '@/lib/validation'

type RegisterShape = UseFormRegister<OrderFormInputValues>
type ErrorShape = FieldErrors<OrderFormInputValues>

export function OrderBuyerIdentityFields(
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
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <InputField
          error={props.errors.customerName?.message}
          label="Comprador"
          placeholder="Cliente Demo"
          {...props.register('customerName')}
        />
        <SelectField
          error={props.errors.buyerType?.message}
          label="Tipo de comprador"
          options={[
            { label: 'Pessoa física', value: 'PERSON' },
            { label: 'Empresa', value: 'COMPANY' },
          ]}
          {...props.register('buyerType')}
        />
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <InputField
          error={props.errors.buyerDocument?.message}
          label={props.documentLabel}
          placeholder={props.documentPlaceholder}
          {...props.register('buyerDocument')}
        />
        <InputField
          error={props.errors.buyerDistrict?.message}
          label="Bairro / regiao"
          placeholder="Centro"
          {...props.register('buyerDistrict')}
        />
      </div>
    </>
  )
}

export function OrderBuyerAddressFields(
  props: Readonly<{
    errors: ErrorShape
    register: RegisterShape
  }>,
) {
  return (
    <div className="mt-5 grid gap-5 lg:grid-cols-2">
      <InputField
        error={props.errors.buyerCity?.message}
        label="Cidade da venda"
        placeholder="São Paulo"
        {...props.register('buyerCity')}
      />
      <InputField
        error={props.errors.buyerState?.message}
        label="Estado"
        placeholder="SP"
        {...props.register('buyerState')}
      />
    </div>
  )
}
