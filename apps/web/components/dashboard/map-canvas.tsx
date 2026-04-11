'use client'

import { useEffect, useRef, useState } from 'react'
import type { LayerGroup, Map as LeafletMap } from 'leaflet'
import type { CurrencyCode, FinanceSummaryResponse } from '@contracts/contracts'
import { formatCurrency } from '@/lib/currency'

type MapTab = 'revenue' | 'orders' | 'profit'

type MapCanvasProps = {
  displayCurrency: CurrencyCode
  points: FinanceSummaryResponse['salesMap']
  tab: MapTab
}

const DEFAULT_CENTER: [number, number] = [-14.235, -52.0]
const DEFAULT_ZOOM = 4

export function MapCanvas({ displayCurrency, points, tab }: Readonly<MapCanvasProps>) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const layerGroupRef = useRef<LayerGroup | null>(null)
  const [mapReady, setMapReady] = useState(false)

  // Init map once
  useEffect(() => {
    let active = true

    async function initMap() {
      if (!containerRef.current || mapRef.current) {return}
      const L = (await import('leaflet')).default
      if (!active || !containerRef.current) {return}

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
      L.control
        .attribution({ position: 'bottomright', prefix: false })
        .addAttribution(
          '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> © <a href="https://carto.com/attributions" target="_blank">CARTO</a>',
        )
        .addTo(map)

      // Heat scale legend
      const Legend = L.Control.extend({
        onAdd() {
          const div = L.DomUtil.create('div')
          div.innerHTML = `
            <div style="background:rgba(13,16,20,0.88);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:8px 12px;font-family:inherit;">
              <p style="margin:0 0 5px;font-size:9px;text-transform:uppercase;letter-spacing:0.12em;color:rgba(255,255,255,0.4);">Escala de calor</p>
              <div style="display:flex;align-items:center;gap:3px;">
                <span style="width:10px;height:10px;border-radius:50%;background:rgba(54,245,124,0.25);display:inline-block;"></span>
                <span style="width:12px;height:12px;border-radius:50%;background:rgba(54,245,124,0.45);display:inline-block;"></span>
                <span style="width:14px;height:14px;border-radius:50%;background:rgba(54,245,124,0.7);display:inline-block;"></span>
                <span style="width:16px;height:16px;border-radius:50%;background:rgba(54,245,124,1);display:inline-block;"></span>
                <span style="font-size:9px;color:rgba(255,255,255,0.5);margin-left:4px;">Maior receita</span>
              </div>
            </div>`
          return div
        },
      })
      new Legend({ position: 'bottomleft' }).addTo(map)

      const layerGroup = L.layerGroup().addTo(map)
      layerGroupRef.current = layerGroup
      mapRef.current = map
      setTimeout(() => {
        map.invalidateSize()
      }, 100)
      setTimeout(() => {
        map.invalidateSize()
      }, 300)
      if (active) {setMapReady(true)}
    }

    initMap()

    return () => {
      active = false
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        layerGroupRef.current = null
      }
    }
  }, [])

  // Update markers when tab/points/mapReady changes
  useEffect(() => {
    let active = true

    async function updateMarkers() {
      if (!mapRef.current || !layerGroupRef.current) {return}
      const L = (await import('leaflet')).default
      if (!active) {return}

      layerGroupRef.current.clearLayers()

      if (!points.length) {
        mapRef.current.setView(DEFAULT_CENTER, DEFAULT_ZOOM)
        return
      }

      const getValue = (p: (typeof points)[0]) =>
        tab === 'revenue' ? p.revenue : tab === 'orders' ? p.orders : p.profit

      const maxValue = Math.max(1, ...points.map(getValue))
      const sorted = [...points].sort((a, b) => getValue(b) - getValue(a))
      const top3Set = new Set(sorted.slice(0, 3).map((p) => `${p.latitude}:${p.longitude}`))

      const bounds: [number, number][] = []

      for (const point of points) {
        const value = getValue(point)
        const ratio = value / maxValue
        const radius = Math.min(40, 10 + Math.log2(Math.max(1, value)) * 4)
        const fillOpacity = Math.max(0.25, ratio)
        const isTop = top3Set.has(`${point.latitude}:${point.longitude}`)

        const revenue = formatCurrency(point.revenue, displayCurrency)
        const profit = formatCurrency(point.profit, displayCurrency)

        const marker = L.circleMarker([point.latitude, point.longitude], {
          radius,
          color: '#36f57c',
          fillColor: '#36f57c',
          fillOpacity,
          weight: isTop ? 2 : 1,
          opacity: 0.9,
        }).bindPopup(
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

        layerGroupRef.current.addLayer(marker)

        // Pulse ring for top 3
        if (isTop) {
          const pulse = L.marker([point.latitude, point.longitude], {
            icon: L.divIcon({
              className: '',
              html: `<div class="map-marker-pulse" style="width:${radius * 2 + 16}px;height:${radius * 2 + 16}px;border-radius:50%;border:2px solid #36f57c;"></div>`,
              iconSize: [0, 0],
              iconAnchor: [radius + 8, radius + 8],
            }),
            interactive: false,
          })
          layerGroupRef.current.addLayer(pulse)
        }

        bounds.push([point.latitude, point.longitude])
      }

      if (points.length === 1) {
        mapRef.current.setView([points[0].latitude, points[0].longitude], 11)
      } else {
        mapRef.current.fitBounds(bounds, { padding: [48, 48], maxZoom: 12 })
      }
    }

    updateMarkers()
    return () => {
      active = false
    }
  }, [displayCurrency, points, tab, mapReady])

  return <div className="h-full w-full min-h-[520px]" ref={containerRef} />
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}
