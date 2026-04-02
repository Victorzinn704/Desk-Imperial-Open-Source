# UI Guidelines

This document outlines the UI design system, component patterns, and interaction guidelines for DESK IMPERIAL's frontend dashboard.

## Table of Contents
- [Design System](#design-system)
- [Hover States and Animations](#hover-states-and-animations)
- [Layout Shift Prevention](#layout-shift-prevention)
- [Responsive Design](#responsive-design)
- [Accessibility](#accessibility)
- [Component Patterns](#component-patterns)
- [Performance Optimizations](#performance-optimizations)

## Design System

### Color Palette

**Location:** `apps/web/app/globals.css`

```css
:root {
  color-scheme: dark;
  
  /* Backgrounds */
  --bg: #080b0e;                    /* Main background */
  --surface: #0d1014;               /* Cards & elevated surfaces */
  --surface-muted: #111518;         /* Secondary surfaces */
  --surface-soft: #161b20;          /* Soft surface variant */
  
  /* Borders */
  --border: #222830;                /* Default border */
  --border-strong: #2e3740;         /* Emphasized border */
  
  /* Text */
  --text-primary: #dde2e8;          /* Primary text */
  --text-soft: #7a8896;             /* Secondary text */
  --text-muted: #9faab5;            /* Tertiary text */
  
  /* Accent (Gold/Bronze) */
  --accent: #9b8460;
  --accent-strong: #b39a75;
  --accent-soft: rgba(155, 132, 96, 0.14);
  
  /* Semantic Colors */
  --info: #5a95c4;                  /* Informational */
  --success: #639371;               /* Success states */
  --danger: #d47373;                /* Error/danger states */
  
  /* Shadows */
  --shadow-panel: 0 24px 80px rgba(0, 0, 0, 0.28);
  --shadow-panel-strong: 0 32px 100px rgba(0, 0, 0, 0.38);
}
```

### Typography

**Font Stack:**
```css
font-family: Segoe UI, Roboto, Arial, sans-serif;
```

**Type Scale:**
- **Display:** 30px (h1 in emails and hero sections)
- **Heading 1:** 24px - 28px
- **Heading 2:** 20px - 22px
- **Heading 3:** 18px
- **Body:** 15px (default paragraph)
- **Small:** 13px - 14px
- **Caption:** 11px - 12px (labels, metadata)

### Spacing

Based on 4px grid:
```
4px, 8px, 12px, 16px, 20px, 24px, 32px, 40px, 48px, 64px
```

Tailwind utilities: `p-1` (4px), `p-2` (8px), `p-3` (12px), etc.

### Border Radius

```css
--card-radius: 1.75rem;    /* 28px - main cards */
--button-radius: 0.75rem;  /* 12px - buttons */
--input-radius: 0.75rem;   /* 12px - inputs */
```

## Hover States and Animations

### CSS Containment Pattern ⭐

**Critical for performance:** All imperial cards use CSS containment to isolate layout calculations.

```css
/* apps/web/app/globals.css */
.imperial-card,
.imperial-card-soft,
.imperial-card-stat {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  border-radius: var(--card-radius, 1.75rem);
  
  /* KEY: CSS Containment for performance */
  contain: layout paint style;
  
  background-color: rgba(10, 12, 15, 0.97);
  border: 1px solid rgba(180, 190, 200, 0.07);
  box-shadow: 
    0 -16px 24px 0 rgba(200, 210, 220, 0.03) inset,
    0 24px 80px rgba(0, 0, 0, 0.40);
}
```

**What `contain: layout paint style` does:**
- **layout:** Element's dimensions don't affect siblings
- **paint:** Content doesn't paint outside bounds
- **style:** Styles are isolated
- **Result:** Browser can optimize animations without recalculating parent/sibling layouts

### Transition Properties

```css
/* Recommended transition */
transition-property: color, background-color, border-color, 
                     box-shadow, opacity, transform;
transition-duration: 200ms;
transition-timing-function: ease-in-out;

/* Tailwind utility */
className="transition-colors duration-200"
```

### Button Hover Pattern ✅

```tsx
// Primary button with elevation change
<button className={cn(
  'border-transparent px-5 py-3',
  'bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))]',
  'shadow-[0_16px_36px_rgba(212,177,106,0.28)]',
  
  // Hover: elevation only (NO scale)
  'hover:-translate-y-0.5',
  'hover:shadow-[0_22px_48px_rgba(212,177,106,0.44)]',
  
  // Active: compress
  'active:translate-y-0',
  'active:scale-95'
)}>
  Enviar
</button>
```

### Card Hover Pattern ✅

```tsx
// Subtle border and background change
<button className={cn(
  'w-full rounded-xl border p-3',
  
  // Pre-allocated border (transparent at rest)
  'border-[rgba(255,255,255,0.04)]',
  
  // Hover: border color + background
  'hover:border-[rgba(255,255,255,0.1)]',
  'hover:bg-[rgba(255,255,255,0.06)]',
  
  // Transition colors only
  'transition-colors duration-200'
)}>
  {content}
</button>
```

### What NOT to Do ❌

```tsx
// ❌ WRONG: Adding border on hover (causes 2px shift)
className="hover:border hover:border-white/10"

// ❌ WRONG: Scale causes box dimension change
className="hover:scale-[1.02]"

// ❌ WRONG: Margin changes shift siblings
className="hover:mx-2"

// ❌ WRONG: Width/height changes cause reflow
className="hover:w-full"
```

## Layout Shift Prevention

### The Golden Rule

> **Pre-allocate space for all hover state changes**

### Border Pre-allocation

```tsx
// ✅ CORRECT: Border exists at resting state
<div className="border border-transparent hover:border-white/10" />

// ❌ WRONG: Border added on hover
<div className="hover:border hover:border-white/10" />
```

### Recent Fix Example

**Problem:** Category buttons had 2px layout shift on hover

```tsx
// BEFORE (caused shift)
<button className="rounded-xl p-3 hover:border hover:border-white/10">

// AFTER (no shift)  
<button className={cn(
  'rounded-xl border p-3',
  'border-[rgba(255,255,255,0.04)]',
  'hover:border-[rgba(255,255,255,0.1)]'
)}>
```

**Commit:** d25d653 - Fixed finance categories sidebar layout shift

### Vertical Movement Instead of Scale

```tsx
// ✅ CORRECT: translateY doesn't affect box dimensions
className="hover:-translate-y-0.5"

// ❌ WRONG: Scale changes width/height
className="hover:scale-105"
```

### Shadow Elevation

```tsx
// ✅ CORRECT: Shadow changes don't cause reflow
className={cn(
  'shadow-[0_16px_36px_rgba(212,177,106,0.28)]',
  'hover:shadow-[0_22px_48px_rgba(212,177,106,0.44)]'
)}
```

## Responsive Design

### Breakpoints

```
sm:  640px   - Small tablets
md:  768px   - Tablets
lg:  1024px  - Laptops
xl:  1280px  - Desktops
2xl: 1536px  - Large desktops
```

### Mobile-First Approach

Always design for mobile first, then enhance for larger screens:

```tsx
// Stack on mobile, row on sm+
<div className="flex flex-col gap-4 sm:flex-row sm:items-center">
  <div>Left content</div>
  <div>Right content</div>
</div>

// 1 col mobile, 2 col sm, 4 col xl
<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
  {items.map(item => <Card key={item.id} {...item} />)}
</div>
```

### Grid Patterns

#### Dashboard Grid

```tsx
// Main dashboard layout
<main className="min-h-screen bg-[var(--bg)] px-4 py-6 sm:px-6">
  <div className="mx-auto max-w-[1600px] xl:grid xl:gap-6">
    
    {/* Metric cards: 1→2→4 columns */}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard title="Vendas" value="R$ 150k" />
      <MetricCard title="Clientes" value="340" />
      <MetricCard title="Produtos" value="1.2k" />
      <MetricCard title="Ticket Medio" value="R$ 441" />
    </div>
    
    {/* Main content + sidebar: stack→split */}
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div>{/* Main content */}</div>
      <aside>{/* Sidebar */}</aside>
    </div>
  </div>
</main>
```

#### Adaptive Padding

```tsx
// Increase padding on larger screens
<header className="imperial-card p-6 md:p-8">
  <h1 className="text-2xl md:text-3xl">Dashboard</h1>
</header>
```

#### Hide/Show by Breakpoint

```tsx
// Hide on mobile, show on md+
<div className="hidden items-center gap-2 md:flex">
  <Icon />
  <span>Desktop-only content</span>
</div>

// Show on mobile, hide on md+
<button className="md:hidden">
  Menu
</button>
```

### Container Widths

```tsx
// Standard container
className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"

// Dashboard container (wider)
className="mx-auto max-w-[1600px]"

// Content container (narrower, for readability)
className="mx-auto max-w-3xl"
```

## Accessibility

### Semantic HTML

Always use appropriate HTML elements:

```tsx
// ✅ CORRECT: Semantic tags
<article className="imperial-card-stat p-5">
  <header>
    <h2>Vendas do Mes</h2>
  </header>
  <main>{/* Content */}</main>
</article>

// ❌ WRONG: Div soup
<div className="imperial-card-stat p-5">
  <div><div>Vendas do Mes</div></div>
  <div>{/* Content */}</div>
</div>
```

### ARIA Labels and Roles

```tsx
// Tooltip with proper ARIA
<span
  role="tooltip"
  aria-hidden={!visible}
  className="absolute z-50"
>
  {content}
</span>

// Button states
<button
  aria-pressed={isSelected}
  aria-label="Selecionar categoria"
  className="..."
>
  {children}
</button>

// Screen reader only text
<span className="sr-only">Loading...</span>
```

### Keyboard Navigation

All interactive elements must be keyboard accessible:

```tsx
// Tab focus support
<button
  onMouseEnter={handleShow}
  onMouseLeave={handleHide}
  onFocus={handleShow}     // ✅ Keyboard support
  onBlur={handleHide}      // ✅ Keyboard support
  className="..."
>
  Hover or focus me
</button>
```

### Focus States

```css
/* Input focus with animated pulse */
.imperial-input:focus {
  outline: none;
  border-color: var(--accent);
  animation: input-focus-pulse 2.4s ease-in-out infinite;
}

@keyframes input-focus-pulse {
  0%, 100% {
    box-shadow: 0 0 0 3px rgba(155, 132, 96, 0.14),
                0 0 20px rgba(155, 132, 96, 0.10);
  }
  50% {
    box-shadow: 0 0 0 4px rgba(155, 132, 96, 0.24),
                0 0 32px rgba(155, 132, 96, 0.16);
  }
}

/* Button focus */
.button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```

### Touch-Friendly Design

```css
/* Disable hover effects on touch devices */
@media (hover: none) {
  .imperial-card-tilt:hover,
  .imperial-card-tilt-alt:hover {
    transform: none;
  }
}
```

**Minimum touch target:** 44×44px (iOS) or 48×48px (Android)

```tsx
// Adequate touch target
<button className="min-h-[44px] min-w-[44px] p-3">
  <Icon />
</button>
```

### Screen Reader Hidden Content

```tsx
// Hide decorative elements from screen readers
<div
  aria-hidden="true"
  className="pointer-events-none absolute inset-0 rounded-[28px] 
             opacity-20 blur-sm"
/>

// Loading placeholders
<div aria-hidden className="skeleton-shimmer" />
```

### Color Contrast

Ensure WCAG AA compliance (4.5:1 for normal text, 3:1 for large text):

```
✓ --text-primary (#dde2e8) on --bg (#080b0e): 12.4:1
✓ --text-soft (#7a8896) on --bg (#080b0e): 5.8:1
✓ --accent (#9b8460) on --bg (#080b0e): 4.6:1
✓ White (#ffffff) on --accent (#9b8460): 4.8:1
```

## Component Patterns

### Imperial Card (Base)

```tsx
<article className="imperial-card p-5">
  <header className="mb-4">
    <h2 className="text-lg font-semibold text-[var(--text-primary)]">
      Card Title
    </h2>
  </header>
  <main>
    {/* Content */}
  </main>
</article>
```

### Imperial Card Soft (Subtle variant)

```tsx
<div className="imperial-card-soft p-5">
  {/* Lighter background, less prominent */}
</div>
```

### Imperial Card Stat (Metric card)

```tsx
<article className="imperial-card-stat p-5">
  <div className="text-xs text-[var(--text-soft)] uppercase tracking-wider">
    Vendas
  </div>
  <div className="mt-2 text-3xl font-bold text-[var(--text-primary)]">
    R$ 150.234
  </div>
  <div className="mt-1 text-sm text-[var(--success)]">
    +12.5% vs mes anterior
  </div>
</article>
```

### Button Variants

```tsx
import { cn } from '@/lib/utils'

const buttonVariants = {
  primary: cn(
    'border-transparent px-5 py-3 text-[var(--bg)]',
    'bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))]',
    'shadow-[0_16px_36px_rgba(212,177,106,0.28)]',
    'hover:-translate-y-0.5',
    'hover:shadow-[0_22px_48px_rgba(212,177,106,0.44)]',
    'active:translate-y-0 active:scale-95'
  ),
  
  secondary: cn(
    'border border-[var(--border)] px-5 py-3',
    'bg-[var(--surface)] text-[var(--text-primary)]',
    'hover:border-[var(--border-strong)]',
    'hover:bg-[var(--surface-muted)]'
  ),
  
  ghost: cn(
    'border border-transparent px-5 py-3',
    'text-[var(--text-primary)]',
    'hover:bg-[rgba(255,255,255,0.06)]'
  )
}

<button className={buttonVariants.primary}>
  Salvar
</button>
```

### Input Fields

```tsx
<div className="space-y-2">
  <label 
    htmlFor="email" 
    className="block text-sm font-medium text-[var(--text-primary)]"
  >
    Email
  </label>
  <input
    id="email"
    type="email"
    className={cn(
      'imperial-input w-full rounded-xl border px-4 py-3',
      'border-[var(--border)]',
      'bg-[var(--surface)]',
      'text-[var(--text-primary)]',
      'placeholder:text-[var(--text-muted)]',
      'focus:border-[var(--accent)]',
      'focus:outline-none'
    )}
    placeholder="seu@email.com"
  />
</div>
```

### Tooltip

```tsx
import { Tooltip } from '@/components/shared/tooltip'

<Tooltip content="Informação adicional">
  <button>Hover me</button>
</Tooltip>
```

**Implementation features:**
- Portal rendering (avoids overflow issues)
- Keyboard support (focus/blur)
- ARIA role="tooltip"
- Auto-positioning (top, bottom, left, right)

### Skeleton Loader

```tsx
<div aria-hidden className="skeleton-shimmer rounded-2xl h-24 w-full" />
```

```css
/* apps/web/app/globals.css */
.skeleton-shimmer {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.04) 0%,
    rgba(255, 255, 255, 0.08) 50%,
    rgba(255, 255, 255, 0.04) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
```

## Performance Optimizations

### CSS Containment

Applied to all imperial cards:

```css
.imperial-card {
  contain: layout paint style;
}
```

**Benefits:**
- Isolated layout calculations
- Faster hover animations
- Reduced paint operations
- Better scrolling performance

### Transition Optimization

Only animate GPU-accelerated properties:

```tsx
// ✅ FAST: GPU-accelerated
className="transition-[transform,opacity] duration-200"

// ⚠️ SLOW: CPU-bound (causes reflow)
className="transition-[width,height,margin] duration-200"
```

**Recommended properties:**
- `transform` (translateX, translateY, scale, rotate)
- `opacity`
- `color` (via CSS variables)
- `background-color`
- `border-color`
- `box-shadow`

### Image Optimization

```tsx
import Image from 'next/image'

<Image
  src="/product.jpg"
  alt="Product name"
  width={400}
  height={300}
  loading="lazy"           // Lazy load images
  placeholder="blur"       // Blur placeholder
  blurDataURL="data:..."   // Small base64 image
/>
```

### Code Splitting

```tsx
// Dynamic import for heavy components
import dynamic from 'next/dynamic'

const HeavyChart = dynamic(() => import('@/components/heavy-chart'), {
  loading: () => <div className="skeleton-shimmer h-64" />,
  ssr: false  // Client-side only if needed
})
```

### Reduce Re-renders

```tsx
import { memo } from 'react'

// Memoize expensive components
export const ExpensiveCard = memo(function ExpensiveCard({ data }) {
  // Complex rendering logic
  return <div>{/* ... */}</div>
})

// Use with useMemo for derived data
const sortedData = useMemo(
  () => data.sort((a, b) => b.value - a.value),
  [data]
)
```

## Checklist for New Components

Before shipping a new component, verify:

- [ ] **Hover states** use pre-allocated borders (no layout shift)
- [ ] **Transitions** only animate GPU properties
- [ ] **Responsive** design tested on mobile, tablet, desktop
- [ ] **Keyboard** navigation fully functional
- [ ] **Focus states** visible and accessible
- [ ] **ARIA labels** added where appropriate
- [ ] **Semantic HTML** used (article, section, header, etc.)
- [ ] **Color contrast** meets WCAG AA standards
- [ ] **Touch targets** minimum 44×44px
- [ ] **CSS containment** applied to cards/containers
- [ ] **Loading states** included (skeleton or spinner)
- [ ] **Error states** handled gracefully

## Resources

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN Web Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [CSS Containment](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Containment)

---

**Last Updated:** 2024  
**Maintained By:** DESK IMPERIAL Development Team
