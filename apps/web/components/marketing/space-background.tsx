'use client'

import { useEffect, useRef } from 'react'

interface Star {
  x: number
  y: number
  r: number
  alpha: number
  speed: number
  t: number
  ts: number
}

interface ForegroundParticle {
  x: number
  y: number
  r: number
  alpha: number
  speedX: number
  speedY: number
  glow: number
  t: number
  ts: number
}

function useDriftCanvas(
  ref: React.RefObject<HTMLCanvasElement | null>,
  setup: (w: number, h: number) => () => void,
) {
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let w = (canvas.width = window.innerWidth)
    let h = (canvas.height = window.innerHeight)

    const onResize = () => {
      w = canvas.width = window.innerWidth
      h = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', onResize)

    const cleanup = setup(w, h)

    return () => {
      cleanup()
      window.removeEventListener('resize', onResize)
    }
  }, [])
}

export function SpaceBackground() {
  const bgRef = useRef<HTMLCanvasElement>(null)
  const fgRef = useRef<HTMLCanvasElement>(null)

  // ── Background layer: distant stars ──────────────────────────────
  useEffect(() => {
    const canvas = bgRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let w = (canvas.width = window.innerWidth)
    let h = (canvas.height = window.innerHeight)

    const onResize = () => {
      w = canvas.width = window.innerWidth
      h = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', onResize)

    const stars: Star[] = Array.from({ length: 280 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.4 + 0.15,
      alpha: Math.random() * 0.65 + 0.15,
      speed: Math.random() * 0.12 + 0.015,
      t: Math.random() * Math.PI * 2,
      ts: Math.random() * 0.016 + 0.003,
    }))

    const accentStars: Star[] = Array.from({ length: 14 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.8 + 0.8,
      alpha: Math.random() * 0.45 + 0.25,
      speed: Math.random() * 0.05 + 0.008,
      t: Math.random() * Math.PI * 2,
      ts: Math.random() * 0.009 + 0.002,
    }))

    let raf: number
    const tick = () => {
      ctx.clearRect(0, 0, w, h)

      for (const s of stars) {
        s.t += s.ts
        s.y -= s.speed
        if (s.y < -2) { s.y = h + 2; s.x = Math.random() * w }
        const a = s.alpha * (0.45 + 0.55 * Math.sin(s.t))
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${a})`
        ctx.fill()
      }

      for (const s of accentStars) {
        s.t += s.ts
        s.y -= s.speed
        if (s.y < -2) { s.y = h + 2; s.x = Math.random() * w }
        const a = s.alpha * (0.4 + 0.6 * Math.sin(s.t))
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(195,164,111,${a})`
        ctx.fill()
      }

      raf = requestAnimationFrame(tick)
    }
    tick()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  // ── Foreground layer: close drifting particles ────────────────────
  useEffect(() => {
    const canvas = fgRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let w = (canvas.width = window.innerWidth)
    let h = (canvas.height = window.innerHeight)

    const onResize = () => {
      w = canvas.width = window.innerWidth
      h = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', onResize)

    // Larger, closer particles with horizontal drift
    const particles: ForegroundParticle[] = Array.from({ length: 38 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 3.2 + 1.2,
      alpha: Math.random() * 0.28 + 0.08,
      speedX: (Math.random() - 0.5) * 0.35,
      speedY: -(Math.random() * 0.55 + 0.18),
      glow: Math.random() * 8 + 4,
      t: Math.random() * Math.PI * 2,
      ts: Math.random() * 0.012 + 0.003,
    }))

    // A few dramatic large orbs that drift across
    const orbs: ForegroundParticle[] = Array.from({ length: 6 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 5 + 3,
      alpha: Math.random() * 0.14 + 0.04,
      speedX: (Math.random() - 0.5) * 0.2,
      speedY: -(Math.random() * 0.3 + 0.08),
      glow: Math.random() * 18 + 10,
      t: Math.random() * Math.PI * 2,
      ts: Math.random() * 0.006 + 0.002,
    }))

    let raf: number
    const tick = () => {
      ctx.clearRect(0, 0, w, h)

      for (const p of [...particles, ...orbs]) {
        p.t += p.ts
        p.x += p.speedX
        p.y += p.speedY
        if (p.y < -p.r * 2) { p.y = h + p.r; p.x = Math.random() * w }
        if (p.x < -p.r * 2) { p.x = w + p.r }
        if (p.x > w + p.r * 2) { p.x = -p.r }

        const a = p.alpha * (0.5 + 0.5 * Math.sin(p.t))

        // Glow effect
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r + p.glow)
        grad.addColorStop(0, `rgba(255,255,255,${a})`)
        grad.addColorStop(0.35, `rgba(195,164,111,${a * 0.45})`)
        grad.addColorStop(1, `rgba(195,164,111,0)`)

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r + p.glow, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()

        // Solid core
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r * 0.55, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${Math.min(a * 1.8, 0.9)})`
        ctx.fill()
      }

      raf = requestAnimationFrame(tick)
    }
    tick()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <>
      {/* Distant stars — behind content */}
      <canvas
        ref={bgRef}
        className="pointer-events-none fixed inset-0 z-0"
        style={{ opacity: 0.9 }}
      />
      {/* Close particles — in front of content */}
      <canvas
        ref={fgRef}
        className="pointer-events-none fixed inset-0 z-[60]"
        style={{ opacity: 1, mixBlendMode: 'screen' }}
      />
    </>
  )
}
