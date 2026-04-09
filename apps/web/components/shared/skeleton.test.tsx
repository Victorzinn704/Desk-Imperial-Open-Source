import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { Skeleton, MetricCardSkeleton, CardSkeleton, CardRowSkeleton, ChartSkeleton, TableSkeleton } from './skeleton'

describe('Skeleton', () => {
  it('renders a div with aria-hidden', () => {
    const { container } = render(<Skeleton />)
    const div = container.firstElementChild as HTMLElement
    expect(div.tagName).toBe('DIV')
    expect(div.getAttribute('aria-hidden')).toBe('true')
  })

  it('has skeleton-shimmer base class', () => {
    const { container } = render(<Skeleton />)
    const div = container.firstElementChild as HTMLElement
    expect(div.className).toContain('skeleton-shimmer')
  })

  it('merges custom className', () => {
    const { container } = render(<Skeleton className="h-4 w-20" />)
    const div = container.firstElementChild as HTMLElement
    expect(div.className).toContain('h-4')
    expect(div.className).toContain('w-20')
    expect(div.className).toContain('skeleton-shimmer')
  })
})

describe('MetricCardSkeleton', () => {
  it('renders without crashing', () => {
    const { container } = render(<MetricCardSkeleton />)
    expect(container.querySelector('article')).not.toBeNull()
  })

  it('contains multiple skeleton shimmer elements', () => {
    const { container } = render(<MetricCardSkeleton />)
    const skeletons = container.querySelectorAll('.skeleton-shimmer')
    expect(skeletons.length).toBeGreaterThanOrEqual(4)
  })
})

describe('CardSkeleton', () => {
  it('renders 1 row by default', () => {
    const { container } = render(<CardSkeleton />)
    const cards = container.querySelectorAll('.imperial-card')
    expect(cards).toHaveLength(1)
  })

  it('renders the specified number of rows', () => {
    const { container } = render(<CardSkeleton rows={3} />)
    const cards = container.querySelectorAll('.imperial-card')
    expect(cards).toHaveLength(3)
  })
})

describe('CardRowSkeleton', () => {
  it('renders 3 rows by default', () => {
    const { container } = render(<CardRowSkeleton />)
    const rows = container.querySelectorAll('.imperial-card-soft')
    expect(rows).toHaveLength(3)
  })

  it('renders the specified number of rows', () => {
    const { container } = render(<CardRowSkeleton rows={5} />)
    const rows = container.querySelectorAll('.imperial-card-soft')
    expect(rows).toHaveLength(5)
  })
})

describe('ChartSkeleton', () => {
  it('renders without crashing', () => {
    const { container } = render(<ChartSkeleton />)
    expect(container.querySelector('.imperial-card')).not.toBeNull()
  })

  it('renders 3 legend skeletons', () => {
    const { container } = render(<ChartSkeleton />)
    const flexContainer = container.querySelector('.flex.gap-3')
    expect(flexContainer).not.toBeNull()
    const legendItems = flexContainer?.querySelectorAll('.skeleton-shimmer')
    expect(legendItems).toHaveLength(3)
  })
})

describe('TableSkeleton', () => {
  it('renders 5 data rows by default plus a header row', () => {
    const { container } = render(<TableSkeleton />)
    const allRows = container.querySelectorAll('.imperial-card-soft')
    // 1 header + 5 data rows = 6
    expect(allRows).toHaveLength(6)
  })

  it('renders the specified number of data rows plus header', () => {
    const { container } = render(<TableSkeleton rows={2} />)
    const allRows = container.querySelectorAll('.imperial-card-soft')
    // 1 header + 2 data rows = 3
    expect(allRows).toHaveLength(3)
  })
})
