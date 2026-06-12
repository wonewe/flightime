import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Airport, TripRecord } from '../types'
import { greatCirclePoints } from '../utils/geo'
import { useTheme } from '../contexts/ThemeContext'

const TILE_DARK = 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png'
const TILE_LIGHT = 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png'

export interface RouteGroup {
  key: string
  from: Airport
  to: Airport
  records: TripRecord[]
}

interface Props {
  routeGroups: RouteGroup[]
  selectedRoute: string | null
}

export function HistoryMap({ routeGroups, selectedRoute }: Props) {
  const { theme } = useTheme()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const linesRef = useRef<Map<string, L.Polyline>>(new Map())

  useEffect(() => {
    if (!containerRef.current) return
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }

    const map = L.map(containerRef.current, {
      center: [35, 130],
      zoom: 3,
      zoomControl: false,
      attributionControl: false,
      dragging: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      touchZoom: true,
      minZoom: 2,
      maxZoom: 8,
    })

    L.tileLayer(theme === 'light' ? TILE_LIGHT : TILE_DARK, { subdomains: 'abcd', maxZoom: 19 }).addTo(map)

    const allBounds: L.LatLngTuple[] = []
    const seen = new Set<string>()
    const lines = new Map<string, L.Polyline>()

    routeGroups.forEach(rg => {
      const pts = greatCirclePoints(rg.from, rg.to, 60)
      const ll = pts.map(p => [p.lat, p.lng] as L.LatLngTuple)
      allBounds.push([rg.from.lat, rg.from.lng], [rg.to.lat, rg.to.lng])

      const line = L.polyline(ll, {
        color: '#60a5fa',
        weight: 1.5,
        opacity: 0.3,
        dashArray: '4,8',
      }).addTo(map)
      lines.set(rg.key, line)

      for (const apt of [rg.from, rg.to]) {
        if (!seen.has(apt.code)) {
          seen.add(apt.code)
          L.marker([apt.lat, apt.lng], {
            icon: L.divIcon({
              className: '',
              iconSize: [60, 32],
              iconAnchor: [30, 8],
              html: `<div style="display:flex;flex-direction:column;align-items:center">
                <div style="width:8px;height:8px;background:#60a5fa;border-radius:50%;box-shadow:0 0 12px rgba(96,165,250,0.5);border:1.5px solid rgba(255,255,255,0.15)"></div>
                <div style="margin-top:4px;font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:600;letter-spacing:.12em;color:rgba(255,255,255,0.45);text-shadow:0 0 8px rgba(0,0,0,0.9);white-space:nowrap">${apt.code}</div>
              </div>`,
            }),
            interactive: false,
          }).addTo(map)
        }
      }
    })

    linesRef.current = lines

    if (allBounds.length > 0) {
      map.fitBounds(allBounds as L.LatLngBoundsExpression, { padding: [40, 40], maxZoom: 5 })
    }

    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  }, [routeGroups, theme])

  useEffect(() => {
    linesRef.current.forEach((line, key) => {
      if (key === selectedRoute) {
        line.setStyle({ opacity: 0.8, weight: 3, dashArray: '' })
        line.bringToFront()
      } else {
        line.setStyle({
          opacity: selectedRoute ? 0.1 : 0.3,
          weight: 1.5,
          dashArray: '4,8',
        })
      }
    })

    if (selectedRoute && mapRef.current) {
      const rg = routeGroups.find(r => r.key === selectedRoute)
      if (rg) {
        const pts = greatCirclePoints(rg.from, rg.to, 60)
        const ll = pts.map(p => [p.lat, p.lng] as L.LatLngTuple)
        mapRef.current.flyToBounds(ll as L.LatLngBoundsExpression, {
          padding: [60, 60],
          duration: 0.8,
          maxZoom: 6,
        })
      }
    } else if (!selectedRoute && mapRef.current && routeGroups.length > 0) {
      const allBounds: L.LatLngTuple[] = []
      routeGroups.forEach(rg => {
        allBounds.push([rg.from.lat, rg.from.lng], [rg.to.lat, rg.to.lng])
      })
      mapRef.current.flyToBounds(allBounds as L.LatLngBoundsExpression, {
        padding: [40, 40],
        maxZoom: 5,
        duration: 0.8,
      })
    }
  }, [selectedRoute, routeGroups])

  return <div ref={containerRef} className="w-full h-full" />
}
