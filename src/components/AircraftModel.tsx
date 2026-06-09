import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const COLOR = '#60a5fa'

interface Spec {
  fLen: number; fRad: number
  wHalf: number; wRoot: number; wTip: number; wSweep: number
  tH: number; tC: number; hsHalf: number; hsC: number
  eRad: number; eLen: number; eX: number[]
}

const SPECS: Record<string, Spec> = {
  b737:  { fLen: 2.4, fRad: 0.16, wHalf: 1.1,  wRoot: 0.5,  wTip: 0.14, wSweep: 0.25, tH: 0.4,  tC: 0.35, hsHalf: 0.35, hsC: 0.2,  eRad: 0.065, eLen: 0.22, eX: [0.5] },
  a320:  { fLen: 2.3, fRad: 0.17, wHalf: 1.15, wRoot: 0.5,  wTip: 0.14, wSweep: 0.22, tH: 0.4,  tC: 0.32, hsHalf: 0.36, hsC: 0.2,  eRad: 0.065, eLen: 0.22, eX: [0.52] },
  b777:  { fLen: 3.4, fRad: 0.24, wHalf: 1.5,  wRoot: 0.7,  wTip: 0.18, wSweep: 0.38, tH: 0.55, tC: 0.4,  hsHalf: 0.45, hsC: 0.25, eRad: 0.1,   eLen: 0.3,  eX: [0.65] },
  a350:  { fLen: 3.1, fRad: 0.23, wHalf: 1.5,  wRoot: 0.65, wTip: 0.17, wSweep: 0.4,  tH: 0.52, tC: 0.38, hsHalf: 0.42, hsC: 0.24, eRad: 0.085, eLen: 0.28, eX: [0.65] },
  b787:  { fLen: 2.9, fRad: 0.22, wHalf: 1.4,  wRoot: 0.6,  wTip: 0.16, wSweep: 0.38, tH: 0.48, tC: 0.36, hsHalf: 0.4,  hsC: 0.22, eRad: 0.09,  eLen: 0.28, eX: [0.6] },
  a380:  { fLen: 3.5, fRad: 0.30, wHalf: 1.8,  wRoot: 0.85, wTip: 0.2,  wSweep: 0.4,  tH: 0.6,  tC: 0.45, hsHalf: 0.5,  hsC: 0.28, eRad: 0.07,  eLen: 0.25, eX: [0.5, 1.0] },
}

const fillMat = new THREE.MeshBasicMaterial({ color: COLOR, transparent: true, opacity: 0.04, side: THREE.DoubleSide, depthWrite: false })
const edgeMat = new THREE.LineBasicMaterial({ color: COLOR, transparent: true, opacity: 0.4 })

function wingGeo(half: number, root: number, tip: number, sweep: number) {
  const s = new THREE.Shape()
  s.moveTo(0, root / 2)
  s.lineTo(half, tip / 2 - sweep)
  s.lineTo(half, -tip / 2 - sweep)
  s.lineTo(0, -root / 2)
  s.lineTo(-half, -tip / 2 - sweep)
  s.lineTo(-half, tip / 2 - sweep)
  s.closePath()
  return new THREE.ShapeGeometry(s)
}

function tailGeo(h: number, c: number) {
  const s = new THREE.Shape()
  s.moveTo(0, h)
  s.lineTo(c * 0.4, 0)
  s.lineTo(-c * 0.15, 0)
  s.closePath()
  return new THREE.ShapeGeometry(s)
}

function Holo({ geo, position, rotation }: {
  geo: THREE.BufferGeometry
  position?: [number, number, number]
  rotation?: [number, number, number]
}) {
  const edges = useMemo(() => new THREE.EdgesGeometry(geo, 1), [geo])
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={geo} material={fillMat} />
      <lineSegments geometry={edges} material={edgeMat} />
    </group>
  )
}

function ProceduralAircraft({ id }: { id: string }) {
  const ref = useRef<THREE.Group>(null!)
  const s = SPECS[id] || SPECS.b737

  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 0.5 })

  const fuselage = useMemo(() => new THREE.CapsuleGeometry(s.fRad, s.fLen, 4, 12), [id])
  const wing = useMemo(() => wingGeo(s.wHalf, s.wRoot, s.wTip, s.wSweep), [id])
  const tail = useMemo(() => tailGeo(s.tH, s.tC), [id])
  const hs = useMemo(() => wingGeo(s.hsHalf, s.hsC, s.hsC * 0.5, s.hsC * 0.2), [id])
  const eng = useMemo(() => new THREE.CylinderGeometry(s.eRad, s.eRad * 0.85, s.eLen, 8), [id])
  const tz = -s.fLen / 2

  return (
    <group ref={ref} rotation={[0.2, 0, 0]}>
      <Holo geo={fuselage} rotation={[Math.PI / 2, 0, 0]} />
      <Holo geo={wing} rotation={[Math.PI / 2, 0, 0]} position={[0, -s.fRad * 0.3, 0]} />
      <Holo geo={tail} position={[0, s.fRad * 0.5, tz + s.tC * 0.3]} />
      <Holo geo={hs} rotation={[Math.PI / 2, 0, 0]} position={[0, s.fRad * 0.3, tz + s.hsC * 0.4]} />
      {s.eX.flatMap(ex => [1, -1].map(side => (
        <Holo key={`${side}-${ex}`} geo={eng}
          position={[side * ex, -(s.fRad + s.eRad * 0.8), -s.wSweep * (ex / s.wHalf) * 0.3]}
          rotation={[Math.PI / 2, 0, 0]} />
      )))}
    </group>
  )
}

export function AircraftPreview({ aircraftId }: { aircraftId: string }) {
  return (
    <Canvas
      camera={{ position: [0, 1.8, 4.5], fov: 32 }}
      gl={{ alpha: true, antialias: true }}
      style={{ background: 'transparent' }}
    >
      <ProceduralAircraft id={aircraftId} />
    </Canvas>
  )
}
