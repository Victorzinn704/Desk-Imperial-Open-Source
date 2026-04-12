'use client'

/* eslint-disable max-lines-per-function */

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
      window.matchMedia('(pointer: coarse)').matches ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return
    }

    const canvas = canvasRef.current
    if (!canvas) {
      return
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return
    }

    let w = (canvas.width = window.innerWidth)
    let h = (canvas.height = window.innerHeight)
    const onResize = () => {
      w = canvas.width = window.innerWidth
      h = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', onResize)

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
    window.addEventListener('mousemove', onMove)

    let raf: number
    const tick = () => {
      ctx.clearRect(0, 0, w, h)

      // Shift trail
      trail.unshift({ x: cursor.x, y: cursor.y, alpha: 1, r: 4.5 })
      if (trail.length > TRAIL_LEN) {
        trail.pop()
      }

      // Draw trail dots (fading, shrinking)
      for (let i = 0; i < trail.length; i++) {
        const dot = trail[i]
        const progress = i / TRAIL_LEN
        const a = (1 - progress) * 0.55
        const r = dot.r * (1 - progress * 0.75)

        // Gold glow around each dot
        const grad = ctx.createRadialGradient(dot.x, dot.y, 0, dot.x, dot.y, r + 6)
        grad.addColorStop(0, `rgba(195,164,111,${a * 0.9})`)
        grad.addColorStop(0.5, `rgba(155,132,96,${a * 0.4})`)
        grad.addColorStop(1, 'rgba(155,132,96,0)')
        ctx.beginPath()
        ctx.arc(dot.x, dot.y, r + 6, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()

        // Solid core
        ctx.beginPath()
        ctx.arc(dot.x, dot.y, Math.max(r * 0.4, 0.5), 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,245,220,${a * 1.2 > 1 ? 1 : a * 1.2})`
        ctx.fill()
      }

      // Main cursor dot — bright white core + golden ring
      const cx = cursor.x
      const cy = cursor.y

      // Outer ring
      ctx.beginPath()
      ctx.arc(cx, cy, 14, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(195,164,111,0.45)'
      ctx.lineWidth = 1
      ctx.stroke()

      // Inner glow
      const cGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 7)
      cGrad.addColorStop(0, 'rgba(255,255,255,0.95)')
      cGrad.addColorStop(0.4, 'rgba(220,190,130,0.6)')
      cGrad.addColorStop(1, 'rgba(155,132,96,0)')
      ctx.beginPath()
      ctx.arc(cx, cy, 7, 0, Math.PI * 2)
      ctx.fillStyle = cGrad
      ctx.fill()

      // Hard center
      ctx.beginPath()
      ctx.arc(cx, cy, 2.5, 0, Math.PI * 2)
      ctx.fillStyle = '#ffffff'
      ctx.fill()

      raf = requestAnimationFrame(tick)
    }
    tick()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return <canvas className="pointer-events-none fixed inset-0 z-[999]" ref={canvasRef} />
}
