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

export function SpaceBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
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

    const stars: Star[] = Array.from({ length: 260 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.6 + 0.2,
      alpha: Math.random() * 0.75 + 0.15,
      speed: Math.random() * 0.15 + 0.02,
      t: Math.random() * Math.PI * 2,
      ts: Math.random() * 0.018 + 0.004,
    }))

    // A few brighter accent stars in gold
    const accentStars: Star[] = Array.from({ length: 12 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 2.2 + 1,
      alpha: Math.random() * 0.5 + 0.3,
      speed: Math.random() * 0.06 + 0.01,
      t: Math.random() * Math.PI * 2,
      ts: Math.random() * 0.01 + 0.003,
    }))

    let raf: number

    const tick = () => {
      ctx.clearRect(0, 0, w, h)

      for (const s of stars) {
        s.t += s.ts
        s.y -= s.speed
        if (s.y < -2) {
          s.y = h + 2
          s.x = Math.random() * w
        }
        const a = s.alpha * (0.45 + 0.55 * Math.sin(s.t))
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${a})`
        ctx.fill()
      }

      for (const s of accentStars) {
        s.t += s.ts
        s.y -= s.speed
        if (s.y < -2) {
          s.y = h + 2
          s.x = Math.random() * w
        }
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

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0"
      style={{ opacity: 0.85 }}
    />
  )
}
