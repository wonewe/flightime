import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { greatCirclePoints, interpolateGreatCircle, bearing } from '../utils/geo'
import { useTheme } from '../contexts/ThemeContext'
import type { ActiveFlight } from '../types'

interface Props {
  flight: ActiveFlight
  username: string
}

const TILE_DARK = 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png'
const TILE_LIGHT = 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png'

const PLANE_SVG = `<svg width="24" height="24" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g filter="url(#fg)"><path d="M18 3C17.2 3 16.5 4.5 16.5 6L16.5 13L6 18.5C5.4 18.8 5 19.3 5 19.8V20.5C5 20.9 5.3 21.1 5.7 21L16.5 17.5V26.5L13 29C12.7 29.2 12.5 29.5 12.5 29.9V30.5C12.5 30.8 12.7 31 13 30.9L18 29L23 30.9C23.3 31 23.5 30.8 23.5 30.5V29.9C23.5 29.5 23.3 29.2 23 29L19.5 26.5V17.5L30.3 21C30.7 21.1 31 20.9 31 20.5V19.8C31 19.3 30.6 18.8 30 18.5L19.5 13V6C19.5 4.5 18.8 3 18 3Z" fill="#c8ddfb"/></g>
  <defs><filter id="fg" x="-4" y="-4" width="44" height="44" filterUnits="userSpaceOnUse"><feGaussianBlur stdDeviation="1" result="b"/><feFlood flood-color="#60a5fa" flood-opacity="0.3" result="c"/><feComposite in="c" in2="b" operator="in" result="s"/><feMerge><feMergeNode in="s"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs></svg>`

function phaseLabel(p: string) {
  return ({ taxiing: 'TAKEOFF', cruising: 'CRUISE', descending: 'DESCENT', landed: 'LANDED' })[p] || p.toUpperCase()
}

function phaseColor(p: string) {
  if (p === 'cruising') return 'bg-emerald-400'
  if (p === 'descending') return 'bg-amber-400'
  return 'bg-sky-400'
}

export function FriendFlightCard({ flight, username }: Props) {
  const { theme } = useTheme()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)

  const from = { lat: flight.from_lat, lng: flight.from_lng }
  const to = { lat: flight.to_lat, lng: flight.to_lng }

  useEffect(() => {
    if (!containerRef.current) return
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }

    const map = L.map(containerRef.current, {
      center: [(from.lat + to.lat) / 2, (from.lng + to.lng) / 2],
      zoom: 4,
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      minZoom: 2,
      maxZoom: 8,
    })

    L.tileLayer(theme === 'light' ? TILE_LIGHT : TILE_DARK, { subdomains: 'abcd', maxZoom: 19 }).addTo(map)

    const pts = greatCirclePoints(from, to, 60)
    const ll = pts.map(p => [p.lat, p.lng] as L.LatLngTuple)
    L.polyline(ll, { color: '#60a5fa', weight: 1.5, opacity: 0.2, dashArray: '4,8' }).addTo(map)

    // Trail up to current progress
    const trailIdx = Math.floor(flight.progress * pts.length)
    const trail = pts.slice(0, trailIdx + 1).map(p => [p.lat, p.lng] as L.LatLngTuple)
    const cur = interpolateGreatCircle(from, to, flight.progress)
    trail.push([cur.lat, cur.lng])
    L.polyline(trail, { color: '#60a5fa', weight: 2.5, opacity: 0.7, lineCap: 'round' }).addTo(map)

    // Plane marker
    const nxt = interpolateGreatCircle(from, to, Math.min(flight.progress + 0.02, 1))
    const rot = bearing(cur, nxt)
    L.marker([cur.lat, cur.lng], {
      icon: L.divIcon({
        className: '',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        html: `<div style="transform:rotate(${rot}deg)">${PLANE_SVG}</div>`,
      }),
      zIndexOffset: 1000,
      interactive: false,
    }).addTo(map)

    // Airport dots
    for (const [apt, code, isOrigin] of [[from, flight.from_code, true], [to, flight.to_code, false]] as const) {
      const c = isOrigin ? '#60a5fa' : '#f59e0b'
      L.marker([apt.lat, apt.lng], {
        icon: L.divIcon({
          className: '',
          iconSize: [40, 24],
          iconAnchor: [20, 4],
          html: `<div style="display:flex;flex-direction:column;align-items:center">
            <div style="width:6px;height:6px;background:${c};border-radius:50%;box-shadow:0 0 8px ${c}80"></div>
            <div style="margin-top:2px;font-family:'JetBrains Mono',monospace;font-size:8px;font-weight:600;letter-spacing:.1em;color:rgba(255,255,255,0.4);white-space:nowrap">${code}</div></div>`,
        }),
        interactive: false,
      }).addTo(map)
    }

    map.fitBounds(ll as L.LatLngBoundsExpression, { padding: [30, 30] })
    mapRef.current = map

    return () => { map.remove(); mapRef.current = null }
  }, [flight.from_code, flight.to_code, flight.progress, flight.phase, theme]) // eslint-disable-line react-hooks/exhaustive-deps

  const pct = Math.round(flight.progress * 100)

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <p className="text-[10px] font-mono text-white/30 tracking-wider mb-2">{username}의 비행</p>
        <div className="flex items-center gap-3">
          <span className="text-[20px] font-mono font-bold text-white/80 tracking-wider">{flight.from_code}</span>
          <div className="flex items-center gap-1.5 flex-1">
            <div className="flex-1 h-px bg-surface/10" />
            <span className="text-[10px] text-white/30">✈</span>
            <div className="flex-1 h-px bg-surface/10" />
          </div>
          <span className="text-[20px] font-mono font-bold text-white/80 tracking-wider">{flight.to_code}</span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[11px] text-white/30">{flight.from_city_ko}</span>
          <span className="text-[11px] text-white/30">{flight.to_city_ko}</span>
        </div>
      </div>

      {/* Mini map */}
      <div className="flex-1 relative mx-4 rounded-xl overflow-hidden border border-surface/[0.06]">
        <div ref={containerRef} className="w-full h-full" />
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse at center, transparent 50%, rgb(var(--bg-base) / 0.4) 100%)'
        }} />
      </div>

      {/* Info bar */}
      <div className="px-6 py-4">
        {/* Progress bar */}
        <div className="w-full h-1 bg-surface/[0.06] rounded-full overflow-hidden mb-3">
          <div className="h-full bg-sky-400/60 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${phaseColor(flight.phase)}`} />
            <span className="text-[10px] font-mono text-white/40 tracking-wider">{phaseLabel(flight.phase)}</span>
          </div>
          <span className="text-[10px] font-mono text-white/30">{pct}%</span>
        </div>

        <div className="flex items-center gap-4 mt-2 text-[10px] font-mono text-white/25">
          <span>{flight.flight_number}</span>
          <span>{flight.aircraft_name}</span>
          <span>{flight.duration_minutes}분</span>
        </div>
      </div>
    </div>
  )
}
