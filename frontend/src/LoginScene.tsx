import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const TEAL = new THREE.Color('#0f766e')
const TEAL_LIGHT = new THREE.Color('#14b8a6')
const SKY = new THREE.Color('#0ea5e9')

/** 斐波那契球面均匀采样 */
function fibonacciSphere(count: number, radius: number): THREE.Vector3[] {
  const pts: THREE.Vector3[] = []
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2
    const r = Math.sqrt(1 - y * y)
    const theta = golden * i
    pts.push(new THREE.Vector3(Math.cos(theta) * r * radius, y * radius, Math.sin(theta) * r * radius))
  }
  return pts
}

/**
 * 登录页 3D 背景:全球资本网络球体 + 流动资金弧线 + 底部数据波浪。
 * 浅色主题、品牌青绿,鼠标视差;prefers-reduced-motion 时只渲染静帧。
 */
export default function LoginScene() {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(42, mount.clientWidth / mount.clientHeight, 0.1, 200)
    camera.position.set(0, 1.2, 30)

    // ---- 网络球体(偏右后方,给左侧文案留白) ----
    const globe = new THREE.Group()
    globe.position.set(9, 1.5, -6)
    scene.add(globe)

    const R = 9.5
    const nodes = fibonacciSphere(620, R)
    const nodeGeo = new THREE.BufferGeometry().setFromPoints(nodes)
    const nodeColors: number[] = []
    for (let i = 0; i < nodes.length; i++) {
      const c = Math.random() < 0.18 ? TEAL_LIGHT : TEAL
      nodeColors.push(c.r, c.g, c.b)
    }
    nodeGeo.setAttribute('color', new THREE.Float32BufferAttribute(nodeColors, 3))
    const nodeMat = new THREE.PointsMaterial({ size: 0.13, vertexColors: true, transparent: true, opacity: 0.75 })
    globe.add(new THREE.Points(nodeGeo, nodeMat))

    // 邻近节点连线(资本网络)
    const linkPositions: number[] = []
    const MAX_LINKS = 520
    outer: for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (nodes[i].distanceTo(nodes[j]) < R * 0.22) {
          linkPositions.push(nodes[i].x, nodes[i].y, nodes[i].z, nodes[j].x, nodes[j].y, nodes[j].z)
          if (linkPositions.length / 6 >= MAX_LINKS) break outer
        }
      }
    }
    const linkGeo = new THREE.BufferGeometry()
    linkGeo.setAttribute('position', new THREE.Float32BufferAttribute(linkPositions, 3))
    globe.add(new THREE.LineSegments(linkGeo, new THREE.LineBasicMaterial({ color: TEAL, transparent: true, opacity: 0.14 })))

    // ---- 流动资金弧线(节点间贝塞尔飞线,drawRange 动画) ----
    interface Arc { line: THREE.Line; total: number; phase: number; speed: number }
    const arcs: Arc[] = []
    const ARC_SEGMENTS = 72
    for (let i = 0; i < 16; i++) {
      const a = nodes[Math.floor(Math.random() * nodes.length)]
      const b = nodes[Math.floor(Math.random() * nodes.length)]
      if (a.distanceTo(b) < R * 0.6) continue
      const mid = a.clone().add(b).multiplyScalar(0.5).normalize().multiplyScalar(R * (1.35 + Math.random() * 0.35))
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b)
      const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(ARC_SEGMENTS))
      const mat = new THREE.LineBasicMaterial({
        color: Math.random() < 0.4 ? SKY : TEAL_LIGHT,
        transparent: true,
        opacity: 0.55,
      })
      const line = new THREE.Line(geo, mat)
      line.geometry.setDrawRange(0, 0)
      globe.add(line)
      arcs.push({ line, total: ARC_SEGMENTS + 1, phase: Math.random(), speed: 0.35 + Math.random() * 0.4 })
    }

    // ---- 底部数据波浪(市场曲面) ----
    const COLS = 90
    const ROWS = 26
    const waveGeo = new THREE.BufferGeometry()
    const wavePos = new Float32Array(COLS * ROWS * 3)
    const waveBase: Array<{ x: number; z: number }> = []
    let w = 0
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = (c / (COLS - 1) - 0.5) * 64
        const z = (r / (ROWS - 1)) * 26 - 10
        waveBase.push({ x, z })
        wavePos[w++] = x
        wavePos[w++] = -8.5
        wavePos[w++] = z
      }
    }
    waveGeo.setAttribute('position', new THREE.BufferAttribute(wavePos, 3))
    const waveMat = new THREE.PointsMaterial({ size: 0.09, color: TEAL, transparent: true, opacity: 0.4 })
    scene.add(new THREE.Points(waveGeo, waveMat))

    // ---- 交互与动画 ----
    const targetRot = { x: 0, y: 0 }
    const onMouse = (e: MouseEvent) => {
      targetRot.y = (e.clientX / window.innerWidth - 0.5) * 0.35
      targetRot.x = (e.clientY / window.innerHeight - 0.5) * 0.2
    }
    window.addEventListener('mousemove', onMouse)

    const onResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(mount.clientWidth, mount.clientHeight)
    }
    window.addEventListener('resize', onResize)

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    const clock = new THREE.Clock()

    const render = () => {
      const t = clock.getElapsedTime()
      globe.rotation.y = t * 0.06 + targetRot.y
      globe.rotation.x = targetRot.x * 0.6
      // 飞线:亮段循环生长-收缩
      for (const arc of arcs) {
        const p = (t * arc.speed + arc.phase) % 1
        const head = Math.floor(p * arc.total * 1.6)
        const start = Math.max(0, head - Math.floor(arc.total * 0.45))
        arc.line.geometry.setDrawRange(start, Math.min(head, arc.total) - start)
      }
      // 波浪
      const pos = waveGeo.getAttribute('position') as THREE.BufferAttribute
      for (let i = 0; i < waveBase.length; i++) {
        const { x, z } = waveBase[i]
        pos.setY(i, -8.5 + Math.sin(x * 0.28 + t * 0.9) * 0.5 + Math.cos(z * 0.45 + t * 0.6) * 0.45)
      }
      pos.needsUpdate = true
      renderer.render(scene, camera)
    }

    if (reduced) {
      render() // 静帧
    } else {
      const loop = () => {
        render()
        raf = requestAnimationFrame(loop)
      }
      loop()
    }

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMouse)
      window.removeEventListener('resize', onResize)
      scene.traverse((obj) => {
        if (obj instanceof THREE.Points || obj instanceof THREE.Line || obj instanceof THREE.LineSegments) {
          obj.geometry.dispose()
          const m = obj.material as THREE.Material
          m.dispose()
        }
      })
      renderer.dispose()
      mount.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={mountRef} className="login-scene" aria-hidden="true" />
}
