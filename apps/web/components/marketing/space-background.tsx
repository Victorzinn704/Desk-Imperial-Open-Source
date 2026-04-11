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

export function SpaceBackground() {
  const bgRef = useRef<HTMLCanvasElement>(null)
  const fgRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef({ x: 0.5, y: 0.5 })

  // Track mouse for parallax
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouseRef.current = {
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      }
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  // ── Background layer — distant slow stars ──────────────────────────
  useEffect(() => {
    const canvas = bgRef.current
    if (!canvas) {return}
    const ctx = canvas.getContext('2d')
    if (!ctx) {return}

    // Respect prefers-reduced-motion: render one static frame, no animation
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const isMobile = window.innerWidth < 768

    let w = (canvas.width = window.innerWidth)
    let h = (canvas.height = window.innerHeight)
    const onResize = () => {
      w = canvas.width = window.innerWidth
      h = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', onResize)

    const starCount = isMobile ? 120 : 320
    const stars: Star[] = Array.from({ length: starCount }, () => {
      const x = Math.random() * w
      const y = Math.random() * h
      return {
        x,
        y,
        ox: x,
        oy: y,
        r: Math.random() * 1.2 + 0.1,
        alpha: Math.random() * 0.55 + 0.12,
        speed: Math.random() * 0.035 + 0.006, // very slow drift up
        t: Math.random() * Math.PI * 2,
        ts: Math.random() * 0.008 + 0.002, // slow twinkle
      }
    })

    const goldStarCount = isMobile ? 6 : 16
    const goldStars: Star[] = Array.from({ length: goldStarCount }, () => {
      const x = Math.random() * w
      const y = Math.random() * h
      return {
        x,
        y,
        ox: x,
        oy: y,
        r: Math.random() * 1.6 + 0.6,
        alpha: Math.random() * 0.4 + 0.18,
        speed: Math.random() * 0.022 + 0.004,
        t: Math.random() * Math.PI * 2,
        ts: Math.random() * 0.006 + 0.0015,
      }
    })

    // Static render for reduced-motion: draw once and stop
    if (prefersReducedMotion) {
      ctx.clearRect(0, 0, w, h)
      for (const s of stars) {
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${s.alpha * 0.7})`
        ctx.fill()
      }
      for (const s of goldStars) {
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(195,164,111,${s.alpha * 0.7})`
        ctx.fill()
      }
      return () => window.removeEventListener('resize', onResize)
    }

    let raf: number
    let running = true

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
          s.ox = Math.random() * w
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
          s.ox = Math.random() * w
        }
        s.y = s.oy + my * 0.12
        s.x = s.ox + mx * 0.12

        const a = s.alpha * (0.45 + 0.55 * Math.sin(s.t))
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(195,164,111,${a})`
        ctx.fill()
      }

      if (running) {raf = requestAnimationFrame(tick)}
    }

    // Visibility change: pause rAF when tab is hidden
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        running = false
        cancelAnimationFrame(raf)
      } else {
        running = true
        raf = requestAnimationFrame(tick)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    tick()

    return () => {
      running = false
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  // ── Foreground layer — close glowing particles with heavy parallax ──
  useEffect(() => {
    const canvas = fgRef.current
    if (!canvas) {return}
    const ctx = canvas.getContext('2d')
    if (!ctx) {return}

    // Respect prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const isMobile = window.innerWidth < 768

    let w = (canvas.width = window.innerWidth)
    let h = (canvas.height = window.innerHeight)
    const onResize = () => {
      w = canvas.width = window.innerWidth
      h = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', onResize)

    const particleCount = isMobile ? 12 : 28
    const particles: FgParticle[] = Array.from({ length: particleCount }, () => {
      const ox = Math.random() * w
      const oy = Math.random() * h
      return {
        x: ox,
        y: oy,
        ox,
        oy,
        r: Math.random() * 2.8 + 1.0,
        alpha: Math.random() * 0.22 + 0.06,
        speedY: -(Math.random() * 0.18 + 0.05), // much slower
        speedX: (Math.random() - 0.5) * 0.12,
        glow: Math.random() * 10 + 6,
        t: Math.random() * Math.PI * 2,
        ts: Math.random() * 0.007 + 0.002,
      }
    })

    const orbCount = isMobile ? 2 : 5
    const orbs: FgParticle[] = Array.from({ length: orbCount }, () => {
      const ox = Math.random() * w
      const oy = Math.random() * h
      return {
        x: ox,
        y: oy,
        ox,
        oy,
        r: Math.random() * 4 + 2.5,
        alpha: Math.random() * 0.1 + 0.03,
        speedY: -(Math.random() * 0.1 + 0.025),
        speedX: (Math.random() - 0.5) * 0.06,
        glow: Math.random() * 22 + 14,
        t: Math.random() * Math.PI * 2,
        ts: Math.random() * 0.004 + 0.001,
      }
    })

    // Pre-concatenate particles + orbs once (avoid spread each frame)
    const allParticles = particles.concat(orbs)

    // Static render for reduced-motion
    if (prefersReducedMotion) {
      ctx.clearRect(0, 0, w, h)
      for (const p of allParticles) {
        const a = p.alpha * 0.7
        // Use solid colors with globalAlpha instead of gradient for static
        ctx.globalAlpha = a
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r + p.glow * 0.3, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(195,164,111,0.5)'
        ctx.fill()
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r * 0.5, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,255,255,0.8)'
        ctx.fill()
      }
      ctx.globalAlpha = 1
      return () => window.removeEventListener('resize', onResize)
    }

    let raf: number
    let running = true

    const tick = () => {
      ctx.clearRect(0, 0, w, h)

      // Stronger parallax offset — foreground feels close
      const mx = (mouseRef.current.x - 0.5) * 60
      const my = (mouseRef.current.y - 0.5) * 40

      for (const p of allParticles) {
        p.t += p.ts
        p.oy += p.speedY
        p.ox += p.speedX
        if (p.oy < -p.r * 3) {
          p.oy = h + p.r
          p.ox = Math.random() * w
        }
        if (p.ox < -p.r * 3) {p.ox = w + p.r}
        if (p.ox > w + p.r * 3) {p.ox = -p.r}

        // Parallax: foreground moves much more with mouse
        p.x = p.ox + mx
        p.y = p.oy + my

        const a = p.alpha * (0.55 + 0.45 * Math.sin(p.t))

        // Use solid colors + globalAlpha to simulate glow without createRadialGradient
        // This avoids ~33 createRadialGradient calls per frame (~1980/min)
        const outerR = p.r + p.glow
        ctx.globalAlpha = a * 0.35
        ctx.beginPath()
        ctx.arc(p.x, p.y, outerR, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(92,110,200,0.6)'
        ctx.fill()

        ctx.globalAlpha = a * 0.5
        ctx.beginPath()
        ctx.arc(p.x, p.y, outerR * 0.55, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(195,164,111,0.7)'
        ctx.fill()

        ctx.globalAlpha = a
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,255,255,0.9)'
        ctx.fill()

        // Bright core
        ctx.globalAlpha = Math.min(a * 2.2, 0.85)
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r * 0.5, 0, Math.PI * 2)
        ctx.fillStyle = '#ffffff'
        ctx.fill()
      }

      ctx.globalAlpha = 1

      if (running) {raf = requestAnimationFrame(tick)}
    }

    // Visibility change: pause rAF when tab is hidden
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        running = false
        cancelAnimationFrame(raf)
      } else {
        running = true
        raf = requestAnimationFrame(tick)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    tick()

    return () => {
      running = false
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      document.removeEventListener('visibilitychange', handleVisibility)
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
