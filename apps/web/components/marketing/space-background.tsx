'use client'

/* eslint-disable max-lines-per-function */

import { useEffect, useRef } from 'react'

interface Star {
  x: number
  y: number
  r: number
  alpha: number
  speed: number
  t: number
  ts: number
  ox: number // origin x for parallax
  oy: number // origin y for parallax
}

interface FgParticle {
  x: number
  y: number
  ox: number
  oy: number
  r: number
  alpha: number
  speedY: number
  speedX: number
  glow: number
  t: number
  ts: number
}

const UINT32_RANGE = 0x100000000

function randomUnit() {
  const values = new Uint32Array(1)
  globalThis.crypto.getRandomValues(values)
  return values[0] / UINT32_RANGE
}

export function SpaceBackground() {
  const bgRef = useRef<HTMLCanvasElement>(null)
  const fgRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef({ x: 0.5, y: 0.5 })

  // Track mouse for parallax
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouseRef.current = {
        x: e.clientX / globalThis.innerWidth,
        y: e.clientY / globalThis.innerHeight,
      }
    }
    globalThis.addEventListener('mousemove', onMove)
    return () => globalThis.removeEventListener('mousemove', onMove)
  }, [])

  // ── Background layer — distant slow stars ──────────────────────────
  useEffect(() => {
    const canvas = bgRef.current
    if (!canvas) {
      return
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return
    }

    let w = (canvas.width = globalThis.innerWidth)
    let h = (canvas.height = globalThis.innerHeight)
    const onResize = () => {
      w = canvas.width = globalThis.innerWidth
      h = canvas.height = globalThis.innerHeight
    }
    globalThis.addEventListener('resize', onResize)

    const stars: Star[] = Array.from({ length: 320 }, () => {
      const x = randomUnit() * w
      const y = randomUnit() * h
      return {
        x,
        y,
        ox: x,
        oy: y,
        r: randomUnit() * 1.2 + 0.1,
        alpha: randomUnit() * 0.55 + 0.12,
        speed: randomUnit() * 0.035 + 0.006, // very slow drift up
        t: randomUnit() * Math.PI * 2,
        ts: randomUnit() * 0.008 + 0.002, // slow twinkle
      }
    })

    const goldStars: Star[] = Array.from({ length: 16 }, () => {
      const x = randomUnit() * w
      const y = randomUnit() * h
      return {
        x,
        y,
        ox: x,
        oy: y,
        r: randomUnit() * 1.6 + 0.6,
        alpha: randomUnit() * 0.4 + 0.18,
        speed: randomUnit() * 0.022 + 0.004,
        t: randomUnit() * Math.PI * 2,
        ts: randomUnit() * 0.006 + 0.0015,
      }
    })

    let raf: number
    const tick = () => {
      ctx.clearRect(0, 0, w, h)

      // Subtle parallax offset for background (very light — feels far away)
      const mx = (mouseRef.current.x - 0.5) * 12
      const my = (mouseRef.current.y - 0.5) * 8

      for (const s of stars) {
        s.t += s.ts
        s.oy -= s.speed
        if (s.oy < -2) {
          s.oy = h + 2
          s.ox = randomUnit() * w
        }
        s.y = s.oy + my * 0.15
        s.x = s.ox + mx * 0.15

        const a = s.alpha * (0.5 + 0.5 * Math.sin(s.t))
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${a})`
        ctx.fill()
      }

      for (const s of goldStars) {
        s.t += s.ts
        s.oy -= s.speed
        if (s.oy < -2) {
          s.oy = h + 2
          s.ox = randomUnit() * w
        }
        s.y = s.oy + my * 0.12
        s.x = s.ox + mx * 0.12

        const a = s.alpha * (0.45 + 0.55 * Math.sin(s.t))
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
      globalThis.removeEventListener('resize', onResize)
    }
  }, [])

  // ── Foreground layer — close glowing particles with heavy parallax ──
  useEffect(() => {
    const canvas = fgRef.current
    if (!canvas) {
      return
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return
    }

    let w = (canvas.width = globalThis.innerWidth)
    let h = (canvas.height = globalThis.innerHeight)
    const onResize = () => {
      w = canvas.width = globalThis.innerWidth
      h = canvas.height = globalThis.innerHeight
    }
    globalThis.addEventListener('resize', onResize)

    const particles: FgParticle[] = Array.from({ length: 28 }, () => {
      const ox = randomUnit() * w
      const oy = randomUnit() * h
      return {
        x: ox,
        y: oy,
        ox,
        oy,
        r: randomUnit() * 2.8 + 1,
        alpha: randomUnit() * 0.22 + 0.06,
        speedY: -(randomUnit() * 0.18 + 0.05), // much slower
        speedX: (randomUnit() - 0.5) * 0.12,
        glow: randomUnit() * 10 + 6,
        t: randomUnit() * Math.PI * 2,
        ts: randomUnit() * 0.007 + 0.002,
      }
    })

    const orbs: FgParticle[] = Array.from({ length: 5 }, () => {
      const ox = randomUnit() * w
      const oy = randomUnit() * h
      return {
        x: ox,
        y: oy,
        ox,
        oy,
        r: randomUnit() * 4 + 2.5,
        alpha: randomUnit() * 0.1 + 0.03,
        speedY: -(randomUnit() * 0.1 + 0.025),
        speedX: (randomUnit() - 0.5) * 0.06,
        glow: randomUnit() * 22 + 14,
        t: randomUnit() * Math.PI * 2,
        ts: randomUnit() * 0.004 + 0.001,
      }
    })

    let raf: number
    const tick = () => {
      ctx.clearRect(0, 0, w, h)

      // Stronger parallax offset — foreground feels close
      const mx = (mouseRef.current.x - 0.5) * 60
      const my = (mouseRef.current.y - 0.5) * 40

      for (const p of [...particles, ...orbs]) {
        p.t += p.ts
        p.oy += p.speedY
        p.ox += p.speedX
        if (p.oy < -p.r * 3) {
          p.oy = h + p.r
          p.ox = randomUnit() * w
        }
        if (p.ox < -p.r * 3) {
          p.ox = w + p.r
        }
        if (p.ox > w + p.r * 3) {
          p.ox = -p.r
        }

        // Parallax: foreground moves much more with mouse
        p.x = p.ox + mx
        p.y = p.oy + my

        const a = p.alpha * (0.55 + 0.45 * Math.sin(p.t))

        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r + p.glow)
        grad.addColorStop(0, `rgba(255,255,255,${a})`)
        grad.addColorStop(0.4, `rgba(195,164,111,${a * 0.5})`)
        grad.addColorStop(1, 'rgba(92,110,200,0)')

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r + p.glow, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r * 0.5, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${Math.min(a * 2.2, 0.85)})`
        ctx.fill()
      }

      raf = requestAnimationFrame(tick)
    }
    tick()

    return () => {
      cancelAnimationFrame(raf)
      globalThis.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <>
      <canvas className="pointer-events-none fixed inset-0 z-0" ref={bgRef} style={{ opacity: 0.92 }} />
      <canvas
        className="pointer-events-none fixed inset-0 z-[60]"
        ref={fgRef}
        style={{ opacity: 1, mixBlendMode: 'screen' }}
      />
    </>
  )
}
