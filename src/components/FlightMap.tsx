import { useEffect, useRef, useMemo, useState, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { greatCirclePoints, interpolateGreatCircle, bearing } from '../utils/geo'
import type { Airport, ActiveFlight } from '../types'

interface FriendFlight extends ActiveFlight {
  username: string
}

interface Props {
  from: Airport
  to: Airport
  progress: number
  friendFlights?: FriendFlight[]
}

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png'

const PLANE_SVG = `<svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g filter="url(#g)"><path d="M18 3C17.2 3 16.5 4.5 16.5 6L16.5 13L6 18.5C5.4 18.8 5 19.3 5 19.8V20.5C5 20.9 5.3 21.1 5.7 21L16.5 17.5V26.5L13 29C12.7 29.2 12.5 29.5 12.5 29.9V30.5C12.5 30.8 12.7 31 13 30.9L18 29L23 30.9C23.3 31 23.5 30.8 23.5 30.5V29.9C23.5 29.5 23.3 29.2 23 29L19.5 26.5V17.5L30.3 21C30.7 21.1 31 20.9 31 20.5V19.8C31 19.3 30.6 18.8 30 18.5L19.5 13V6C19.5 4.5 18.8 3 18 3Z" fill="#c8ddfb"/><line x1="18" y1="7" x2="18" y2="14" stroke="#8bb4f0" stroke-width="0.8" stroke-dasharray="1.5 1.5" opacity="0.5"/></g>
  <defs><filter id="g" x="-4" y="-4" width="44" height="44" filterUnits="userSpaceOnUse"><feGaussianBlur stdDeviation="1.5" result="b"/><feFlood flood-color="#60a5fa" flood-opacity="0.4" result="c"/><feComposite in="c" in2="b" operator="in" result="s"/><feMerge><feMergeNode in="s"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs></svg>`

const createPlaneIcon = (rot: number) => L.divIcon({
  className: '', iconSize: [36, 36], iconAnchor: [18, 18],
  html: `<div style="transform:rotate(${rot}deg)">${PLANE_SVG}</div>`,
})

const FRIEND_PLANE_SVG = `<svg width="24" height="24" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g filter="url(#fg2)"><path d="M18 3C17.2 3 16.5 4.5 16.5 6L16.5 13L6 18.5C5.4 18.8 5 19.3 5 19.8V20.5C5 20.9 5.3 21.1 5.7 21L16.5 17.5V26.5L13 29C12.7 29.2 12.5 29.5 12.5 29.9V30.5C12.5 30.8 12.7 31 13 30.9L18 29L23 30.9C23.3 31 23.5 30.8 23.5 30.5V29.9C23.5 29.5 23.3 29.2 23 29L19.5 26.5V17.5L30.3 21C30.7 21.1 31 20.9 31 20.5V19.8C31 19.3 30.6 18.8 30 18.5L19.5 13V6C19.5 4.5 18.8 3 18 3Z" fill="#34d399"/></g>
  <defs><filter id="fg2" x="-4" y="-4" width="44" height="44" filterUnits="userSpaceOnUse"><feGaussianBlur stdDeviation="1" result="b"/><feFlood flood-color="#34d399" flood-opacity="0.4" result="c"/><feComposite in="c" in2="b" operator="in" result="s"/><feMerge><feMergeNode in="s"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs></svg>`

const createFriendPlaneIcon = (rot: number, username: string) => L.divIcon({
  className: '', iconSize: [24, 40], iconAnchor: [12, 12],
  html: `<div style="display:flex;flex-direction:column;align-items:center">
    <div style="transform:rotate(${rot}deg)">${FRIEND_PLANE_SVG}</div>
    <div style="margin-top:2px;font-family:'JetBrains Mono',monospace;font-size:8px;font-weight:600;color:#34d399;text-shadow:0 0 8px rgba(0,0,0,0.9);white-space:nowrap;letter-spacing:.08em">${username}</div>
  </div>`,
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

type ViewMode = 'normal' | 'heading'
const HEADING_ZOOM = 8

function shortestRotation(current: number, target: number): number {
  let delta = target - current
  delta = ((delta % 360) + 540) % 360 - 180
  return current + delta
}

// How often (ms) we sync Leaflet's center for tile loading in heading mode
const TILE_SYNC_MS = 3000

export function FlightMap({ from, to, progress, friendFlights = [] }: Props) {
  const mapRef = useRef<L.Map | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const rotateWrapRef = useRef<HTMLDivElement>(null)
  const planeRef = useRef<L.Marker | null>(null)
  const trailRef = useRef<L.Polyline | null>(null)
  const friendMarkersRef = useRef<Map<string, L.Marker>>(new Map())
  const friendLinesRef = useRef<Map<string, L.Polyline>>(new Map())
  const lastIconRotRef = useRef(0)
  const cumulativeRotRef = useRef(0)
  const lastTileSyncRef = useRef(0)
  const lastTrailUpdateRef = useRef(0)

  const [viewMode, setViewMode] = useState<ViewMode>('normal')

  const pts = useMemo(() => greatCirclePoints(from, to, 100), [from, to])

  // ── Init map ──
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = L.map(containerRef.current, {
      center: [(from.lat + to.lat) / 2, (from.lng + to.lng) / 2], zoom: 5,
      zoomControl: false, attributionControl: false,
      dragging: true, scrollWheelZoom: true, doubleClickZoom: true,
      touchZoom: true, keyboard: true,
      zoomSnap: 0.5, zoomDelta: 0.5, minZoom: 3, maxZoom: 12,
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

  // ── Per-frame update ──
  useEffect(() => {
    if (!planeRef.current || !trailRef.current || !mapRef.current) return
    const map = mapRef.current
    const cur = interpolateGreatCircle(from, to, progress)
    const nxt = interpolateGreatCircle(from, to, Math.min(progress + 0.02, 1))
    const rot = bearing(cur, nxt)

    // Marker position (just a CSS transform change — cheap)
    planeRef.current.setLatLng([cur.lat, cur.lng])
    if (Math.abs(rot - lastIconRotRef.current) > 0.5) {
      planeRef.current.setIcon(createPlaneIcon(rot))
      lastIconRotRef.current = rot
    }

    // Trail update throttled to ~5fps (SVG path rebuild is expensive at 60fps)
    const now = performance.now()
    if (now - lastTrailUpdateRef.current > 200) {
      lastTrailUpdateRef.current = now
      const idx = Math.floor(progress * pts.length)
      const trail = pts.slice(0, idx + 1).map(p => [p.lat, p.lng] as L.LatLngTuple)
      trail.push([cur.lat, cur.lng])
      trailRef.current.setLatLngs(trail)
    }

    // ── Heading mode: CSS-only camera ──
    // Zero Leaflet camera calls → zero jitter.
    // Periodically sync Leaflet center (every 3s) just for tile loading.
    if (viewMode === 'heading' && rotateWrapRef.current) {
      const now = performance.now()
      if (now - lastTileSyncRef.current > TILE_SYNC_MS) {
        map.setView([cur.lat, cur.lng], map.getZoom(), { animate: false })
        lastTileSyncRef.current = now
      }

      const size = map.getSize()
      const pp = map.latLngToContainerPoint(L.latLng(cur.lat, cur.lng))
      const dx = size.x / 2 - pp.x
      const dy = size.y / 2 - pp.y

      const targetRot = -rot
      cumulativeRotRef.current = shortestRotation(cumulativeRotRef.current, targetRot)

      rotateWrapRef.current.style.transformOrigin = `${pp.x}px ${pp.y}px`
      rotateWrapRef.current.style.transform =
        `translate(${dx}px, ${dy}px) rotate(${cumulativeRotRef.current}deg)`
    }

    // Normal mode: no camera movement, no transform — zero jitter
  }, [progress, from, to, pts, viewMode])

  // ── Mode toggle ──
  const handleToggle = useCallback(() => {
    setViewMode(prev => {
      const next = prev === 'normal' ? 'heading' : 'normal'
      const map = mapRef.current
      const wrap = rotateWrapRef.current
      if (!map || !wrap) return next

      if (next === 'heading') {
        // Expand wrapper for rotation coverage, center on plane
        wrap.style.inset = '-75%'
        requestAnimationFrame(() => {
          map.invalidateSize()
          const cur = interpolateGreatCircle(from, to, progress)
          map.setView([cur.lat, cur.lng], HEADING_ZOOM, { animate: false })
          lastTileSyncRef.current = performance.now()
        })
      } else {
        // Reset everything, shrink wrapper, show full route
        wrap.style.transform = ''
        wrap.style.transformOrigin = ''
        wrap.style.inset = '0'
        cumulativeRotRef.current = 0
        requestAnimationFrame(() => {
          map.invalidateSize()
          const ll = pts.map(p => [p.lat, p.lng] as L.LatLngTuple)
          map.fitBounds(ll as L.LatLngBoundsExpression, { padding: [80, 80] })
        })
      }
      return next
    })
  }, [from, to, progress, pts])

  // ── Friend flights ──
  useEffect(() => {
    if (!mapRef.current) return
    const map = mapRef.current
    const currentIds = new Set(friendFlights.map(f => f.user_id))

    friendMarkersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) { marker.remove(); friendMarkersRef.current.delete(id) }
    })
    friendLinesRef.current.forEach((line, id) => {
      if (!currentIds.has(id)) { line.remove(); friendLinesRef.current.delete(id) }
    })

    friendFlights.forEach(ff => {
      const ffFrom = { lat: ff.from_lat, lng: ff.from_lng }
      const ffTo = { lat: ff.to_lat, lng: ff.to_lng }
      const cur = interpolateGreatCircle(ffFrom, ffTo, ff.progress)
      const nxt = interpolateGreatCircle(ffFrom, ffTo, Math.min(ff.progress + 0.02, 1))
      const rot = bearing(cur, nxt)

      if (!friendLinesRef.current.has(ff.user_id)) {
        const fpts = greatCirclePoints(ffFrom, ffTo, 60)
        const ll = fpts.map(p => [p.lat, p.lng] as L.LatLngTuple)
        const line = L.polyline(ll, { color: '#34d399', weight: 1, opacity: 0.2, dashArray: '4,6' }).addTo(map)
        friendLinesRef.current.set(ff.user_id, line)
      }

      const existing = friendMarkersRef.current.get(ff.user_id)
      if (existing) {
        existing.setLatLng([cur.lat, cur.lng])
        existing.setIcon(createFriendPlaneIcon(rot, ff.username))
      } else {
        const marker = L.marker([cur.lat, cur.lng], {
          icon: createFriendPlaneIcon(rot, ff.username),
          zIndexOffset: 900,
          interactive: false,
        }).addTo(map)
        friendMarkersRef.current.set(ff.user_id, marker)
      }
    })
  }, [friendFlights])

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        ref={rotateWrapRef}
        className="absolute"
        style={{ inset: '0' }}
      >
        <div ref={containerRef} className="w-full h-full" style={{ cursor: 'grab' }} />
      </div>

      <div className="absolute inset-0 pointer-events-none z-[999]" style={{ background: 'radial-gradient(ellipse at center,transparent 50%,rgba(6,10,20,0.6) 100%)' }} />

      {/* View mode toggle */}
      <button
        onClick={handleToggle}
        className="absolute bottom-4 right-4 z-[1000] w-9 h-9 flex items-center justify-center rounded-full backdrop-blur-md bg-night-900/70 border border-white/10 hover:bg-white/10 transition-colors"
        title={viewMode === 'normal' ? '비행기 시점' : '일반 시점'}
      >
        {viewMode === 'normal' ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 19 21 12 17 5 21 12 2" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
        )}
      </button>
    </div>
  )
}
