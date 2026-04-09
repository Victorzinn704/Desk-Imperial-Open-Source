import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from './button'

describe('Button', () => {
  it('renders children text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeDefined()
  })

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('is disabled when loading is true', () => {
    render(<Button loading>Loading</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('renders loading spinner when loading', () => {
    const { container } = render(<Button loading>Loading</Button>)
    // LoaderCircle renders an SVG with animate-spin class
    const svg = container.querySelector('svg.animate-spin')
    expect(svg).not.toBeNull()
  })

  it('does not render spinner when not loading', () => {
    const { container } = render(<Button>Normal</Button>)
    const svg = container.querySelector('svg.animate-spin')
    expect(svg).toBeNull()
  })

  it('calls onClick handler when clicked', () => {
    const handler = vi.fn()
    render(<Button onClick={handler}>Click</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('does not call onClick when disabled', () => {
    const handler = vi.fn()
    render(
      <Button disabled onClick={handler}>
        Click
      </Button>,
    )
    fireEvent.click(screen.getByRole('button'))
    expect(handler).not.toHaveBeenCalled()
  })

  it('applies primary variant class by default', () => {
    render(<Button>Primary</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('bg-[var(--accent)]')
  })

  it('applies secondary variant class', () => {
    render(<Button variant="secondary">Secondary</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('bg-[var(--surface-muted)]')
  })

  it('applies ghost variant class', () => {
    render(<Button variant="ghost">Ghost</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('bg-transparent')
  })

  it('applies small size class', () => {
    render(<Button size="sm">Small</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('h-10')
  })

  it('applies medium size class by default', () => {
    render(<Button>Medium</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('h-12')
  })

  it('applies large size class', () => {
    render(<Button size="lg">Large</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('h-14')
  })

  it('applies fullWidth class when fullWidth is true', () => {
    render(<Button fullWidth>Full</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('w-full')
  })

  it('merges custom className', () => {
    render(<Button className="custom-class">Custom</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('custom-class')
  })

  it('passes through additional HTML attributes', () => {
    render(
      <Button type="submit" data-testid="submit-btn">
        Submit
      </Button>,
    )
    const btn = screen.getByTestId('submit-btn')
    expect(btn.getAttribute('type')).toBe('submit')
  })
})
