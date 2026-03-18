'use client'

import { useEffect, useRef, useState } from 'react'
import type { CurrencyCode, FinanceSummaryResponse } from '@contracts/contracts'
import { formatCurrency } from '@/lib/currency'

type SalesMapCanvasProps = {
  displayCurrency: CurrencyCode
  points: FinanceSummaryResponse['salesMap']
}

const DEFAULT_CENTER: [number, number] = [-14.235, -52.0]
const DEFAULT_ZOOM = 4

export function SalesMapCanvas({ displayCurrency, points }: Readonly<SalesMapCanvasProps>) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<import('leaflet').Map | null>(null)
  const markersRef = useRef<import('leaflet').CircleMarker[]>([])
  const [mapReady, setMapReady] = useState(false)

  useEffect(() => {
    let active = true

    async function initMap() {
      if (!containerRef.current || mapRef.current) return

      const L = (await import('leaflet')).default

      if (!active || !containerRef.current) return

      const map = L.map(containerRef.current, {
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        zoomControl: false,
        attributionControl: false,
      })

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxZoom: 20,
        tileSize: 256,
      }).addTo(map)

      L.control.zoom({ position: 'topright' }).addTo(map)
      L.control.attribution({ position: 'bottomright', prefix: false })
        .addAttribution('© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> © <a href="https://carto.com/attributions" target="_blank">CARTO</a>')
        .addTo(map)

      mapRef.current = map
      setTimeout(() => { map.invalidateSize() }, 0)
      if (active) setMapReady(true)
    }

    initMap()

    return () => {
      active = false
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    let active = true

    async function updateMarkers() {
      if (!mapRef.current) return
      const L = (await import('leaflet')).default
      if (!active) return

      for (const m of markersRef.current) m.remove()
      markersRef.current = []

      if (!points.length) {
        mapRef.current.setView(DEFAULT_CENTER, DEFAULT_ZOOM)
        return
      }

      const bounds: [number, number][] = []

      for (const point of points) {
        const radius = Math.min(28, 8 + Math.log2(Math.max(1, point.orders)) * 3)
        const revenue = formatCurrency(point.revenue, displayCurrency)
        const profit = formatCurrency(point.profit, displayCurrency)

        const marker = L.circleMarker([point.latitude, point.longitude], {
          radius,
          color: '#36f57c',
          fillColor: '#36f57c',
          fillOpacity: 0.18,
          weight: 2,
          opacity: 0.9,
        })
          .bindPopup(
            `<div class="sales-map-popup">
              <p class="sales-map-popup__label">${escapeHtml(point.label)}</p>
              <div class="sales-map-popup__grid">
                <div><span>Vendas</span><strong>${point.orders}</strong></div>
                <div><span>Receita</span><strong>${escapeHtml(revenue)}</strong></div>
                <div><span>Lucro</span><strong>${escapeHtml(profit)}</strong></div>
              </div>
            </div>`,
            { className: 'sales-map-leaflet-popup' },
          )
          .addTo(mapRef.current)

        markersRef.current.push(marker)
        bounds.push([point.latitude, point.longitude])
      }

      if (points.length === 1) {
        mapRef.current.setView([points[0].latitude, points[0].longitude], 11)
      } else {
        mapRef.current.fitBounds(bounds, { padding: [48, 48], maxZoom: 12 })
      }
    }

    updateMarkers()

    return () => { active = false }
  }, [displayCurrency, points, mapReady])

  return <div className="h-full w-full" ref={containerRef} />
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}
