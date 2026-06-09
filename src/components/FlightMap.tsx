import { useEffect, useRef, useMemo } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { greatCirclePoints, interpolateGreatCircle, bearing } from '../utils/geo'
import type { Airport } from '../types'

interface Props {
  from: Airport
  to: Airport
  progress: number
}

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png'

const PLANE_SVG = `<svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g filter="url(#g)"><path d="M18 3C17.2 3 16.5 4.5 16.5 6L16.5 13L6 18.5C5.4 18.8 5 19.3 5 19.8V20.5C5 20.9 5.3 21.1 5.7 21L16.5 17.5V26.5L13 29C12.7 29.2 12.5 29.5 12.5 29.9V30.5C12.5 30.8 12.7 31 13 30.9L18 29L23 30.9C23.3 31 23.5 30.8 23.5 30.5V29.9C23.5 29.5 23.3 29.2 23 29L19.5 26.5V17.5L30.3 21C30.7 21.1 31 20.9 31 20.5V19.8C31 19.3 30.6 18.8 30 18.5L19.5 13V6C19.5 4.5 18.8 3 18 3Z" fill="#c8ddfb"/><line x1="18" y1="7" x2="18" y2="14" stroke="#8bb4f0" stroke-width="0.8" stroke-dasharray="1.5 1.5" opacity="0.5"/></g>
  <defs><filter id="g" x="-4" y="-4" width="44" height="44" filterUnits="userSpaceOnUse"><feGaussianBlur stdDeviation="1.5" result="b"/><feFlood flood-color="#60a5fa" flood-opacity="0.4" result="c"/><feComposite in="c" in2="b" operator="in" result="s"/><feMerge><feMergeNode in="s"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs></svg>`

const createPlaneIcon = (rot: number) => L.divIcon({
  className: '', iconSize: [36, 36], iconAnchor: [18, 18],
  html: `<div style="transform:rotate(${rot}deg);transition:transform .3s ease">${PLANE_SVG}</div>`,
})

const createAirportIcon = (code: string, isOrigin: boolean) => {
  const c = isOrigin ? '#60a5fa' : '#f59e0b'
  return L.divIcon({
    className: '', iconSize: [50, 36], iconAnchor: [25, 6],
    html: `<div style="display:flex;flex-direction:column;align-items:center">
      <div style="width:12px;height:12px;background:${c};border-radius:50%;box-shadow:0 0 16px ${c}80,0 0 6px ${c}50;border:2px solid rgba(255,255,255,0.2)"></div>
      <div style="margin-top:6px;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:600;letter-spacing:.15em;color:rgba(255,255,255,0.6);text-shadow:0 0 12px rgba(0,0,0,0.9);white-space:nowrap">${code}</div></div>`,
  })
}

export function FlightMap({ from, to, progress }: Props) {
  const mapRef = useRef<L.Map | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const planeRef = useRef<L.Marker | null>(null)
  const trailRef = useRef<L.Polyline | null>(null)

  const pts = useMemo(() => greatCirclePoints(from, to, 100), [from, to])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = L.map(containerRef.current, {
      center: [(from.lat+to.lat)/2, (from.lng+to.lng)/2], zoom: 5,
      zoomControl: false, attributionControl: false,
      dragging: true, scrollWheelZoom: true, doubleClickZoom: true, touchZoom: true, keyboard: true,
      zoomSnap: 0.5, zoomDelta: 0.5, minZoom: 3, maxZoom: 10,
    })
    L.tileLayer(TILE_URL, { subdomains: 'abcd', maxZoom: 19 }).addTo(map)
    const ll = pts.map(p => [p.lat, p.lng] as L.LatLngTuple)
    L.polyline(ll, { color: '#60a5fa', weight: 1.5, opacity: 0.15, dashArray: '6,10' }).addTo(map)
    trailRef.current = L.polyline([], { color: '#60a5fa', weight: 3, opacity: 0.8, lineCap: 'round' }).addTo(map)
    L.marker([from.lat, from.lng], { icon: createAirportIcon(from.code, true), interactive: false }).addTo(map)
    L.marker([to.lat, to.lng], { icon: createAirportIcon(to.code, false), interactive: false }).addTo(map)
    planeRef.current = L.marker([from.lat, from.lng], { icon: createPlaneIcon(90), zIndexOffset: 1000, interactive: false }).addTo(map)
    mapRef.current = map
    map.fitBounds(ll as L.LatLngBoundsExpression, { padding: [80, 80] })
    return () => { map.remove(); mapRef.current = null }
  }, [from, to, pts])

  useEffect(() => {
    if (!planeRef.current || !trailRef.current) return
    const cur = interpolateGreatCircle(from, to, progress)
    const nxt = interpolateGreatCircle(from, to, Math.min(progress + 0.02, 1))
    planeRef.current.setLatLng([cur.lat, cur.lng])
    planeRef.current.setIcon(createPlaneIcon(bearing(cur, nxt)))
    const idx = Math.floor(progress * pts.length)
    const trail = pts.slice(0, idx + 1).map(p => [p.lat, p.lng] as L.LatLngTuple)
    trail.push([cur.lat, cur.lng])
    trailRef.current.setLatLngs(trail)
  }, [progress, from, to, pts])

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="w-full h-full" style={{ cursor: 'grab' }} />
      <div className="absolute inset-0 pointer-events-none z-[999]" style={{ background: 'radial-gradient(ellipse at center,transparent 50%,rgba(6,10,20,0.6) 100%)' }} />
    </div>
  )
}
