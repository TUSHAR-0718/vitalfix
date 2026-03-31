'use client'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export default function HeroCanvas() {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!mountRef.current) return
    const el = mountRef.current

    // Scene
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(60, el.clientWidth / el.clientHeight, 0.1, 1000)
    camera.position.z = 80

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(el.clientWidth, el.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    el.appendChild(renderer.domElement)

    // Particle system
    const PARTICLE_COUNT = 1800
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(PARTICLE_COUNT * 3)
    const colors = new Float32Array(PARTICLE_COUNT * 3)
    const sizes = new Float32Array(PARTICLE_COUNT)

    const palette = [
      new THREE.Color('#818cf8'),
      new THREE.Color('#60a5fa'),
      new THREE.Color('#34d399'),
      new THREE.Color('#a855f7'),
    ]

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 200
      positions[i * 3 + 1] = (Math.random() - 0.5) * 200
      positions[i * 3 + 2] = (Math.random() - 0.5) * 100

      const c = palette[Math.floor(Math.random() * palette.length)]
      colors[i * 3]     = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b

      sizes[i] = Math.random() * 1.8 + 0.4
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

    // Circular dot texture
    const canvas2d = document.createElement('canvas')
    canvas2d.width = 32; canvas2d.height = 32
    const ctx = canvas2d.getContext('2d')!
    const grd = ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
    grd.addColorStop(0, 'rgba(255,255,255,1)')
    grd.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = grd
    ctx.beginPath(); ctx.arc(16, 16, 16, 0, Math.PI * 2); ctx.fill()
    const texture = new THREE.CanvasTexture(canvas2d)

    const material = new THREE.PointsMaterial({
      size: 1.2,
      map: texture,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    })

    const particles = new THREE.Points(geometry, material)
    scene.add(particles)

    // Connecting lines (sparse grid feel)
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x7c6bff,
      transparent: true,
      opacity: 0.06,
    })
    const lineGeo = new THREE.BufferGeometry()
    const linePoints: number[] = []
    for (let i = 0; i < 80; i++) {
      const x1 = (Math.random() - 0.5) * 200
      const y1 = (Math.random() - 0.5) * 200
      const z1 = (Math.random() - 0.5) * 80
      linePoints.push(x1, y1, z1, x1 + (Math.random() - 0.5) * 40, y1 + (Math.random() - 0.5) * 40, z1)
    }
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePoints, 3))
    const lines = new THREE.LineSegments(lineGeo, lineMaterial)
    scene.add(lines)

    // Mouse tracking
    let mouseX = 0, mouseY = 0
    const onMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener('mousemove', onMouseMove)

    // Resize handler
    const onResize = () => {
      camera.aspect = el.clientWidth / el.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(el.clientWidth, el.clientHeight)
    }
    window.addEventListener('resize', onResize)

    // Animation
    let frame = 0
    let animId: number
    const animate = () => {
      animId = requestAnimationFrame(animate)
      frame += 0.003

      particles.rotation.y = frame * 0.04 + mouseX * 0.08
      particles.rotation.x = frame * 0.02 - mouseY * 0.04
      lines.rotation.y = frame * 0.03 + mouseX * 0.05
      lines.rotation.x = -mouseY * 0.03

      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div
      ref={mountRef}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  )
}
