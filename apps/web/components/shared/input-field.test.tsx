import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { InputField } from './input-field'

describe('InputField', () => {
  it('renders the label text', () => {
    render(<InputField label="Email" />)
    expect(screen.getByText('Email')).toBeDefined()
  })

  it('renders an input element', () => {
    render(<InputField label="Name" placeholder="Enter name" />)
    const input = screen.getByPlaceholderText('Enter name')
    expect(input).toBeDefined()
    expect(input.tagName).toBe('INPUT')
  })

  it('displays error message when error prop is provided', () => {
    render(<InputField label="Email" error="Invalid email" />)
    expect(screen.getByText('Invalid email')).toBeDefined()
  })

  it('applies error styling to input when error is present', () => {
    const { container } = render(<InputField label="Email" error="Invalid" />)
    const input = container.querySelector('input')
    expect(input?.className).toContain('border-[var(--danger)]')
  })

  it('displays hint when no error is present', () => {
    render(<InputField label="Email" hint="We will not share your email" />)
    expect(screen.getByText('We will not share your email')).toBeDefined()
  })

  it('does not display hint when error is present', () => {
    render(<InputField label="Email" hint="Helpful hint" error="Error msg" />)
    expect(screen.queryByText('Helpful hint')).toBeNull()
    expect(screen.getByText('Error msg')).toBeDefined()
  })

  it('does not display error or hint when neither is provided', () => {
    const { container } = render(<InputField label="Name" />)
    const paragraphs = container.querySelectorAll('p')
    expect(paragraphs).toHaveLength(0)
  })

  it('calls onChange when input value changes', () => {
    const onChange = vi.fn()
    render(<InputField label="Name" onChange={onChange} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'test' } })
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('passes through HTML input attributes', () => {
    render(<InputField label="Password" type="password" maxLength={20} />)
    const input = screen.getByLabelText('Password')
    expect(input.getAttribute('type')).toBe('password')
    expect(input.getAttribute('maxlength')).toBe('20')
  })

  it('wraps input in a label element', () => {
    const { container } = render(<InputField label="Name" />)
    const label = container.querySelector('label')
    expect(label).not.toBeNull()
    const input = label?.querySelector('input')
    expect(input).not.toBeNull()
  })
})
