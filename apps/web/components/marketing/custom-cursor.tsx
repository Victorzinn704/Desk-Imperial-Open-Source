'use client'

import { useEffect, useRef } from 'react'

interface TrailDot {
  x: number
  y: number
  alpha: number
  r: number
}

export function CustomCursor() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (
      globalThis.matchMedia('(pointer: coarse)').matches ||
      globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return
    }

    const canvas = canvasRef.current
    if (!canvas) {return}
    const ctx = canvas.getContext('2d')
    if (!ctx) {return}

    let w = (canvas.width = globalThis.innerWidth)
    let h = (canvas.height = globalThis.innerHeight)
    const onResize = () => {
      w = canvas.width = globalThis.innerWidth
      h = canvas.height = globalThis.innerHeight
    }
    globalThis.addEventListener('resize', onResize)

    const cursor = { x: -200, y: -200 }
    const trail: TrailDot[] = []
    const TRAIL_LEN = 22

    // Pre-fill trail
    for (let i = 0; i < TRAIL_LEN; i++) {
      trail.push({ x: -200, y: -200, alpha: 0, r: 0 })
    }

    const onMove = (e: MouseEvent) => {
      cursor.x = e.clientX
      cursor.y = e.clientY
    }
    globalThis.addEventListener('mousemove', onMove)

    let raf: number
    let running = true

    const tick = () => {
      ctx.clearRect(0, 0, w, h)

      // Shift trail
      trail.unshift({ x: cursor.x, y: cursor.y, alpha: 1, r: 4.5 })
      if (trail.length > TRAIL_LEN) {trail.pop()}

      // Draw trail dots (fading, shrinking) — use solid circles + globalAlpha
      // instead of createRadialGradient per dot to reduce GPU cost
      for (let i = 0; i < trail.length; i++) {
        const dot = trail[i]
        const progress = i / TRAIL_LEN
        const a = (1 - progress) * 0.55
        const r = dot.r * (1 - progress * 0.75)

        // Outer glow — concentric solid circles simulate gradient
        ctx.globalAlpha = a * 0.4
        ctx.beginPath()
        ctx.arc(dot.x, dot.y, r + 6, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(155,132,96,0.5)'
        ctx.fill()

        ctx.globalAlpha = a * 0.9
        ctx.beginPath()
        ctx.arc(dot.x, dot.y, r + 2, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(195,164,111,0.7)'
        ctx.fill()

        // Solid core
        ctx.globalAlpha = Math.min(a * 1.2, 1)
        ctx.beginPath()
        ctx.arc(dot.x, dot.y, Math.max(r * 0.4, 0.5), 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,245,220,1)'
        ctx.fill()
      }

      ctx.globalAlpha = 1

      // Main cursor dot — bright white core + golden ring
      const cx = cursor.x
      const cy = cursor.y

      // Outer ring
      ctx.beginPath()
      ctx.arc(cx, cy, 14, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(195,164,111,0.45)'
      ctx.lineWidth = 1
      ctx.stroke()

      // Inner glow — concentric solid circles instead of gradient
      ctx.globalAlpha = 0.6
      ctx.beginPath()
      ctx.arc(cx, cy, 7, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(155,132,96,0.5)'
      ctx.fill()

      ctx.globalAlpha = 0.8
      ctx.beginPath()
      ctx.arc(cx, cy, 4, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(220,190,130,0.7)'
      ctx.fill()

      ctx.globalAlpha = 0.95
      ctx.beginPath()
      ctx.arc(cx, cy, 2, 0, Math.PI * 2)
      ctx.fillStyle = '#ffffff'
      ctx.fill()

      ctx.globalAlpha = 1

      // Hard center
      ctx.beginPath()
      ctx.arc(cx, cy, 2.5, 0, Math.PI * 2)
      ctx.fillStyle = '#ffffff'
      ctx.fill()

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
      globalThis.removeEventListener('mousemove', onMove)
      globalThis.removeEventListener('resize', onResize)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  return <canvas className="pointer-events-none fixed inset-0 z-[999]" ref={canvasRef} />
}
