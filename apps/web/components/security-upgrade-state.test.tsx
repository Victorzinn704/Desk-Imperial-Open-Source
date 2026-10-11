import type { ComponentProps, ReactNode } from 'react'
import { renderToString } from 'react-dom/server'
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CookieConsentBanner } from './shared/cookie-consent-banner'
import { ComandaFormPane } from './pdv/comanda-modal/components/form-pane'
import { useSalaoEnvironmentController } from './dashboard/salao-environment.controller'
import type { View } from './dashboard/salao'
import { persistCookieConsent, readCookieConsentChoice } from '@/lib/cookie-consent'

vi.mock('@/lib/cookie-consent', () => ({
  readCookieConsentChoice: vi.fn(() => null),
  persistCookieConsent: vi.fn(),
}))
vi.mock('@/lib/api', () => ({
  updateCookiePreferences: vi.fn().mockResolvedValue({}),
  fetchMesas: vi.fn().mockResolvedValue([]),
  fetchOperationsLive: vi.fn().mockResolvedValue(undefined),
  createMesa: vi.fn(),
  updateMesa: vi.fn(),
}))
vi.mock('./pdv/comanda-modal/components/printer-section', () => ({ PrinterSection: () => null }))

afterEach(cleanup)
beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(readCookieConsentChoice).mockReturnValue(null)
})

describe('estado apos atualizacao das dependencias', () => {
  it('preserva a troca local do salao e acompanha uma nova prop inicial', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const onViewChange = vi.fn()
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
    const { result, rerender, unmount } = renderHook(
      ({ initialView }: { initialView: View }) => useSalaoEnvironmentController({ initialView, onViewChange }),
      { initialProps: { initialView: 'operacional' as View }, wrapper },
    )
    act(() => result.current.setSalaoView('planta'))
    rerender({ initialView: 'operacional' })
    expect(result.current.view).toBe('planta')
    expect(onViewChange).toHaveBeenCalledWith('planta')
    rerender({ initialView: 'comandas' })
    expect(result.current.view).toBe('comandas')
    expect(onViewChange).toHaveBeenCalledTimes(1)
    unmount()
    client.clear()
  })

  it('mantem o rascunho percentual, normaliza no blur e recebe alteracoes externas', () => {
    const props = formProps()
    const { rerender } = render(<ComandaFormPane {...props} />)
    const input = screen.getByLabelText('Desconto %')
    fireEvent.change(input, { target: { value: '125' } })
    rerender(<ComandaFormPane {...props} />)
    expect(input).toHaveValue(125)
    fireEvent.blur(input)
    expect(input).toHaveValue(100)
    expect(props.onSetDesconto).toHaveBeenLastCalledWith(100)
    rerender(<ComandaFormPane {...props} desconto={20} />)
    expect(input).toHaveValue(20)
    fireEvent.change(input, { target: { value: '-4' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(props.onSetDesconto).toHaveBeenLastCalledWith(0)
    rerender(<ComandaFormPane {...props} desconto={Number.NaN} />)
    expect(input).toHaveValue(null)
    fireEvent.blur(input)
    expect(props.onSetDesconto).toHaveBeenLastCalledWith(0)
  })

  it('nao le armazenamento nem mostra o banner no SSR', () => {
    expect(renderToString(<CookieConsentBanner />)).toBe('')
    expect(readCookieConsentChoice).not.toHaveBeenCalled()
  })

  it('preserva decisao salva e mostra o banner apenas sem decisao', () => {
    vi.mocked(readCookieConsentChoice).mockReturnValue({ analytics: true, marketing: false })
    const { unmount } = render(<CookieConsentBanner />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    unmount()
    vi.mocked(readCookieConsentChoice).mockReturnValue(null)
    render(<CookieConsentBanner />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('salva a escolha de essenciais e fecha o banner', async () => {
    render(<CookieConsentBanner />)
    fireEvent.click(screen.getByRole('button', { name: 'Essenciais' }))
    expect(persistCookieConsent).toHaveBeenCalledWith({ analytics: false, marketing: false })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})

function formProps(): ComponentProps<typeof ComandaFormPane> {
  return {
    clienteDocumento: '',
    clienteNome: '',
    acrescimo: 0,
    desconto: 10,
    bruto: 100,
    total: 90,
    itemCount: 1,
    mesa: '',
    notes: '',
    connectionState: 'idle',
    docLabel: 'CPF',
    docValidation: { valid: true },
    isBusy: false,
    isEditing: false,
    itensLength: 1,
    saveError: null,
    selectedPrinterId: '',
    statusMessage: '',
    printers: [],
    onChoosePrinter: vi.fn(),
    onClose: vi.fn(),
    onRefreshPrinters: vi.fn(),
    requirePin: vi.fn(),
    onSave: vi.fn(),
    onSaveAndPrint: vi.fn(),
    onSetAcrescimo: vi.fn(),
    onSetClienteDocumento: vi.fn(),
    onSetClienteNome: vi.fn(),
    onSetDesconto: vi.fn(),
    onSetMesa: vi.fn(),
    onSetNotes: vi.fn(),
  }
}
