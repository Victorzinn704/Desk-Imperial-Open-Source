import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SelectField } from './select-field'

const options = [
  { label: 'Option A', value: 'a' },
  { label: 'Option B', value: 'b' },
  { label: 'Option C', value: 'c' },
]

describe('SelectField', () => {
  it('renders the label', () => {
    render(<SelectField label="Category" options={options} />)
    expect(screen.getByText('Category')).toBeDefined()
  })

  it('renders all options', () => {
    render(<SelectField label="Category" options={options} />)
    const selectElement = screen.getByRole('combobox')
    const optionElements = selectElement.querySelectorAll('option')
    expect(optionElements).toHaveLength(3)
    expect(optionElements[0].textContent).toBe('Option A')
    expect(optionElements[0].value).toBe('a')
    expect(optionElements[1].textContent).toBe('Option B')
    expect(optionElements[2].textContent).toBe('Option C')
  })

  it('renders empty when no options provided', () => {
    render(<SelectField label="Empty" options={[]} />)
    const selectElement = screen.getByRole('combobox')
    expect(selectElement.querySelectorAll('option')).toHaveLength(0)
  })

  it('displays error message when error prop is provided', () => {
    render(<SelectField label="Cat" options={options} error="Required" />)
    expect(screen.getByText('Required')).toBeDefined()
  })

  it('applies error styling to select when error is present', () => {
    render(<SelectField label="Cat" options={options} error="Required" />)
    const select = screen.getByRole('combobox')
    expect(select.className).toContain('border-[var(--danger)]')
  })

  it('displays hint when no error is present', () => {
    render(<SelectField label="Cat" options={options} hint="Choose one" />)
    expect(screen.getByText('Choose one')).toBeDefined()
  })

  it('does not display hint when error is present', () => {
    render(<SelectField label="Cat" options={options} hint="Choose one" error="Required" />)
    expect(screen.queryByText('Choose one')).toBeNull()
    expect(screen.getByText('Required')).toBeDefined()
  })

  it('does not display error or hint when neither is provided', () => {
    const { container } = render(<SelectField label="Cat" options={options} />)
    expect(container.querySelectorAll('p')).toHaveLength(0)
  })

  it('calls onChange when selection changes', () => {
    const onChange = vi.fn()
    render(<SelectField label="Cat" options={options} onChange={onChange} />)
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'b' } })
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('passes through HTML select attributes', () => {
    render(<SelectField label="Cat" options={options} data-testid="my-select" disabled />)
    const select = screen.getByTestId('my-select')
    expect(select).toBeDisabled()
  })

  it('wraps select in a label element', () => {
    const { container } = render(<SelectField label="Cat" options={options} />)
    const label = container.querySelector('label')
    expect(label).not.toBeNull()
    expect(label?.querySelector('select')).not.toBeNull()
  })
})
