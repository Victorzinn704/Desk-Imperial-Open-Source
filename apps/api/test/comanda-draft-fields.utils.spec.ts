import { BadRequestException } from '@nestjs/common'
import { prepareComandaDraftFields } from '../src/modules/operations/comanda-draft-fields.utils'

describe('prepareComandaDraftFields', () => {
  it('sanitiza campos e aplica fallbacks padrão', () => {
    expect(
      prepareComandaDraftFields({
        customerDocument: '123.456.789-00',
        customerName: 'Maria',
        discountAmount: undefined,
        fallbackParticipantCount: 1,
        notes: 'mesa externa',
        participantCount: undefined,
        serviceFeeAmount: undefined,
        subtotal: 100,
        tableLabel: 'Mesa 7',
      }),
    ).toEqual({
      customerDocument: '123.456.789-00',
      customerName: 'Maria',
      discountAmount: 0,
      notes: 'mesa externa',
      participantCount: 1,
      serviceFeeAmount: 0,
      tableLabel: 'Mesa 7',
    })
  })

  it('usa fallbacks monetários e de participantes no modo replace', () => {
    expect(
      prepareComandaDraftFields({
        customerDocument: null,
        customerName: null,
        fallbackDiscountAmount: 3.4,
        fallbackParticipantCount: 4,
        fallbackServiceFeeAmount: 10.2,
        notes: null,
        participantCount: undefined,
        subtotal: 100,
        tableLabel: 'Mesa 2',
      }),
    ).toEqual({
      customerDocument: null,
      customerName: null,
      discountAmount: 3.4,
      notes: null,
      participantCount: 4,
      serviceFeeAmount: 10.2,
      tableLabel: 'Mesa 2',
    })
  })

  it('bloqueia participante inválido', () => {
    expect(() =>
      prepareComandaDraftFields({
        fallbackParticipantCount: 0,
        participantCount: 0,
        subtotal: 10,
        tableLabel: 'Mesa 1',
      }),
    ).toThrow(BadRequestException)
  })
})
