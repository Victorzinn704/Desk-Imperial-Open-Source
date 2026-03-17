'use client'

import { useEffect, useRef, type MutableRefObject } from 'react'
import type { CurrencyCode, FinanceSummaryResponse } from '@contracts/contracts'
import { formatCurrency } from '@/lib/currency'

type SalesMapCanvasProps = {
  displayCurrency: CurrencyCode
  points: FinanceSummaryResponse['salesMap']
}

type MapLibreModule = typeof import('maplibre-gl')

type MarkerHandle = {
  marker: import('maplibre-gl').Marker
  popup: import('maplibre-gl').Popup
}

const DEFAULT_CENTER: [number, number] = [-52.0, -14.235]
const MAP_STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? 'https://tiles.openfreemap.org/styles/liberty'

export function SalesMapCanvas({ displayCurrency, points }: Readonly<SalesMapCanvasProps>) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<import('maplibre-gl').Map | null>(null)
  const markersRef = useRef<MarkerHandle[]>([])

  useEffect(() => {
    let active = true
    let cleanup: (() => void) | undefined

    async function initializeMap() {
      if (!containerRef.current || mapRef.current) {
        return
      }

      const maplibregl = await import('maplibre-gl')
      if (!active || !containerRef.current) {
        return
      }

      const map = new maplibregl.Map({
        attributionControl: false,
        center: DEFAULT_CENTER,
        container: containerRef.current,
        cooperativeGestures: true,
        pitch: 38,
        style: MAP_STYLE_URL,
        zoom: 3.4,
      })

      map.dragRotate.disable()
      map.touchZoomRotate.disableRotation()
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
      map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')

      mapRef.current = map
      cleanup = () => {
        clearMarkers(markersRef)
        map.remove()
        mapRef.current = null
      }
    }

    initializeMap()

    return () => {
      active = false
      cleanup?.()
    }
  }, [])

  useEffect(() => {
    let active = true

    async function updateScene() {
      if (!mapRef.current) {
        return
      }

      const maplibregl = await import('maplibre-gl')
      if (!active || !mapRef.current) {
        return
      }

      if (!mapRef.current.isStyleLoaded()) {
        mapRef.current.once('load', () => {
          if (!active || !mapRef.current) {
            return
          }

          syncMarkers(maplibregl, mapRef.current, markersRef, points, displayCurrency)
        })
        return
      }

      syncMarkers(maplibregl, mapRef.current, markersRef, points, displayCurrency)
    }

    updateScene()

    return () => {
      active = false
    }
  }, [displayCurrency, points])

  return <div className="h-full w-full" ref={containerRef} />
}

function syncMarkers(
  maplibregl: MapLibreModule,
  map: import('maplibre-gl').Map,
  markersRef: MutableRefObject<MarkerHandle[]>,
  points: FinanceSummaryResponse['salesMap'],
  displayCurrency: CurrencyCode,
) {
  clearMarkers(markersRef)

  if (!points.length) {
    map.easeTo({
      center: DEFAULT_CENTER,
      duration: 900,
      zoom: 3.4,
    })
    return
  }

  const bounds = new maplibregl.LngLatBounds()

  for (const point of points) {
    const element = document.createElement('button')
    element.className = 'sales-map-marker'
    element.type = 'button'
    element.setAttribute('aria-label', `Abrir detalhes de ${point.label}`)
    element.style.setProperty('--marker-size', `${Math.min(80, 32 + Math.log2(Math.max(1, point.orders)) * 5)}px`)

    const pulse = document.createElement('span')
    pulse.className = 'sales-map-marker__pulse'
    element.appendChild(pulse)

    const core = document.createElement('span')
    core.className = 'sales-map-marker__core'
    core.textContent = String(point.orders)
    element.appendChild(core)

    const popup = new maplibregl.Popup({
      closeButton: false,
      closeOnMove: false,
      offset: 18,
    }).setHTML(buildPopupMarkup(point, displayCurrency))

    const marker = new maplibregl.Marker({
      anchor: 'center',
      element,
    })
      .setLngLat([point.longitude, point.latitude])
      .setPopup(popup)
      .addTo(map)

    element.addEventListener('mouseenter', () => popup.addTo(map))
    element.addEventListener('mouseleave', () => popup.remove())
    element.addEventListener('click', () => popup.isOpen() ? popup.remove() : popup.addTo(map))

    markersRef.current.push({ marker, popup })
    bounds.extend([point.longitude, point.latitude])
  }

  if (points.length === 1) {
    map.easeTo({
      center: [points[0].longitude, points[0].latitude],
      duration: 900,
      zoom: 11.2,
    })
    return
  }

  map.fitBounds(bounds, {
    duration: 900,
    maxZoom: 11.5,
    padding: {
      top: 64,
      right: 64,
      bottom: 64,
      left: 64,
    },
  })
}

function clearMarkers(markersRef: MutableRefObject<MarkerHandle[]>) {
  for (const handle of markersRef.current) {
    handle.popup.remove()
    handle.marker.remove()
  }

  markersRef.current = []
}

function buildPopupMarkup(
  point: FinanceSummaryResponse['salesMap'][number],
  displayCurrency: CurrencyCode,
) {
  const revenue = formatCurrency(point.revenue, displayCurrency)
  const profit = formatCurrency(point.profit, displayCurrency)

  return `
    <div class="sales-map-popup">
      <p class="sales-map-popup__label">${escapeHtml(point.label)}</p>
      <div class="sales-map-popup__grid">
        <div>
          <span>Vendas</span>
          <strong>${point.orders}</strong>
        </div>
        <div>
          <span>Receita</span>
          <strong>${escapeHtml(revenue)}</strong>
        </div>
        <div>
          <span>Lucro</span>
          <strong>${escapeHtml(profit)}</strong>
        </div>
      </div>
    </div>
  `
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}
