'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { isSoftwareRenderer, shouldEnable3D } from '@/lib/device-capabilities'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// ============================================================================
// LaLounge3DBackground
// ----------------------------------------------------------------------------
// Direct conversion of `upload/la lounge 3D background.html` to a React TSX
// component. All Three.js setup runs inside a single `useEffect` (empty deps)
// and renders into a fixed full-screen container that sits behind page content
// (z-index: -1, pointer-events: none). The scene, camera, materials, helpers,
// furniture generators, build-in animation, cinematic camera spline and orbit
// are preserved 1:1 from the source HTML.
// ============================================================================

export default function LaLounge3DBackground() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    const isMobile = window.innerWidth < 768
    if (!container) return

    // v41-g2-F1 Fix #1: gate the heavy 3D scene on device capability.
    // Skips entirely on prefers-reduced-motion / no WebGL / < 2 cores /
    // < 2 GB so low-end devices get the static gradient fallback instead.
    // (Threshold values live in src/lib/device-capabilities.ts as
    // MIN_CORES_FOR_3D / MIN_MEMORY_GB_FOR_3D — see Task 2b fix.)
    if (!shouldEnable3D()) return

    // `cleanup` is assigned at the end of the try-block once every resource
    // that needs tearing down has been created. If setup throws, cleanup stays
    // undefined and the effect simply returns undefined.
    let cleanup: (() => void) | undefined

    try {
      // ============================================
      // SCENE SETUP
      // ============================================
      const scene = new THREE.Scene()

      const camera = new THREE.PerspectiveCamera(
        isMobile ? 55 : 45,
        window.innerWidth / window.innerHeight,
        0.1,
        1000,
      )
      // v41-g2-F2 Fix #4: mobile uses a wider FOV (55 vs 45) which makes
      // the lounge interior appear smaller / over-zoomed at the same
      // distance, causing a cramped "pulled-in" feel on small screens.
      // Pull the initial camera Z back from 90 → 110 on mobile to
      // compensate. The animate() loop overwrites this on the first
      // frame, but it also seeds the camPath/orbit pull-back below.
      camera.position.set(0, 15, isMobile ? 110 : 90)
      camera.lookAt(0, 2, 60)

      // v42 smoothness fix: detect software rasterizers (SwiftShader /
      // llvmpipe). They run on the CPU where per-draw-call overhead and
      // fill-rate dominate — the ~700-draw-call scene below measured 5 FPS
      // under SwiftShader, so they get a dedicated strategy (immediate
      // static merge + reduced start resolution).
      const isSoftware = isSoftwareRenderer()

      const renderer = new THREE.WebGLRenderer({
        // v42 smoothness fix: MSAA rasterization of ~23K wireframe line
        // segments dominates the frame cost in software rasterizers —
        // measured 7.5 → 16.3 FPS just by disabling it. Software renderers
        // therefore run without AA (the reduced-resolution CSS upscale
        // masks the jaggies); real GPUs keep full antialiasing.
        antialias: !isSoftware,
        // v42 smoothness fix (THE critical one): an alpha:true canvas with
        // setClearColor(0x000000, 0) forces the compositor to blend every
        // semi-transparent fullscreen pixel against the page layers below
        // — in software rendering (SwiftShader) that measured ~140ms per
        // frame (~5-7 FPS) even after the draw-call merge. Rendering the
        // "blueprint paper" white (#fdfcff — the exact color the page
        // paints behind the canvas) opaquely inside the canvas gives a
        // pixel-identical image on a fast opaque copy path.
        alpha: false,
        powerPreference: 'high-performance',
      })
      // Software rasterizers start at a reduced resolution (the CSS layout
      // still stretches the canvas to 100vw/100vh, so it is a cheap blur,
      // not a layout change): 0.75 DPR ≈ 44% of the pixels ≈ 2.3× cheaper
      // fill. A runtime watchdog (in animate) adapts this both ways.
      const baseDpr = Math.min(window.devicePixelRatio, 2.0)
      let pixelScale = isSoftware ? 0.75 : 1.0
      renderer.setPixelRatio(baseDpr * pixelScale)
      renderer.setSize(window.innerWidth, window.innerHeight)
      // Opaque "blueprint paper" background (matches the page's fixed
      // #fdfcff layer that shows through in the no-WebGL fallback).
      renderer.setClearColor(0xfdfcff, 1)
      renderer.domElement.style.display = 'block'
      container.appendChild(renderer.domElement)

      function applyPixelScale() {
        renderer.setPixelRatio(baseDpr * pixelScale)
        renderer.setSize(window.innerWidth, window.innerHeight)
      }

      // ============================================
      // LIGHTING
      // ============================================
      scene.add(new THREE.AmbientLight(0xffffff, 0.6))
      const dirLight = new THREE.DirectionalLight(0xd946ef, 0.8)
      dirLight.position.set(50, 100, 50)
      scene.add(dirLight)
      const dirLight2 = new THREE.DirectionalLight(0xa21caf, 0.4)
      dirLight2.position.set(-50, 50, -50)
      scene.add(dirLight2)

      // ============================================
      // MATERIALS
      // ============================================
      const matStruct = new THREE.LineBasicMaterial({
        color: 0x86198f,
        transparent: true,
        opacity: 0.9,
      })
      const matMain = new THREE.LineBasicMaterial({
        color: 0xa21caf,
        transparent: true,
        opacity: 0.7,
      })
      const matSub = new THREE.LineBasicMaterial({
        color: 0xc026d3,
        transparent: true,
        opacity: 0.5,
      })
      const matAccent = new THREE.LineBasicMaterial({
        color: 0xd946ef,
        transparent: true,
        opacity: 0.9,
      })
      const matHidden = new THREE.LineDashedMaterial({
        color: 0xf0abfc,
        dashSize: 0.4,
        gapSize: 0.2,
        transparent: true,
        opacity: 0.6,
      })

      const matVolume = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.15,
        shininess: 100,
        specular: 0xd946ef,
        side: THREE.DoubleSide,
      })
      const matVolumeAccent = new THREE.MeshPhongMaterial({
        color: 0xfdf4ff,
        transparent: true,
        opacity: 0.25,
        shininess: 100,
        specular: 0xd946ef,
        side: THREE.DoubleSide,
      })
      const matGlass = new THREE.MeshPhongMaterial({
        color: 0xfbcfe8,
        transparent: true,
        opacity: 0.1,
        shininess: 100,
        specular: 0xffffff,
        side: THREE.DoubleSide,
      })
      const matZone = new THREE.MeshBasicMaterial({
        color: 0xfae8ff,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
      })
      const matRug = new THREE.MeshBasicMaterial({
        color: 0xf5d0fe,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
      })

      // ============================================
      // HELPER FUNCTIONS
      // ============================================
      function volBox(
        w: number,
        h: number,
        d: number,
        x: number,
        y: number,
        z: number,
        matFill?: THREE.Material,
        matEdge?: THREE.LineBasicMaterial,
      ) {
        const group = new THREE.Group()
        const geo = new THREE.BoxGeometry(w, h, d)
        const mesh = new THREE.Mesh(geo, matFill ?? matVolume)
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), matEdge ?? matStruct)
        group.add(mesh)
        group.add(edges)
        group.position.set(x, y, z)
        return group
      }

      function volCyl(
        rt: number,
        rb: number,
        h: number,
        x: number,
        z: number,
        matFill?: THREE.Material | number,
        matEdge?: THREE.LineBasicMaterial,
        y?: number,
      ) {
        const group = new THREE.Group()
        // The source HTML sometimes passes a bare number (e.g. `0.5`) where a
        // material is expected (food-truck wheels). Coerce any non-Material
        // value to the default volume material so the wheels still render
        // instead of crashing the WebGLRenderer.
        const fill: THREE.Material = matFill instanceof THREE.Material ? matFill : matVolume
        const edge: THREE.LineBasicMaterial = matEdge ?? matMain
        const geo = new THREE.CylinderGeometry(rt, rb, h, 24)
        const mesh = new THREE.Mesh(geo, fill)
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), edge)
        group.add(mesh)
        group.add(edges)
        group.position.set(x, y !== undefined ? y : h / 2, z)
        return group
      }

      function dashedLine(p1: THREE.Vector3, p2: THREE.Vector3) {
        const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([p1, p2]), matHidden)
        l.computeLineDistances()
        return l
      }

      function solidLine(p1: THREE.Vector3, p2: THREE.Vector3, mat?: THREE.LineBasicMaterial) {
        return new THREE.Line(new THREE.BufferGeometry().setFromPoints([p1, p2]), mat ?? matSub)
      }

      function createZone(w: number, d: number, x: number, z: number, mat?: THREE.Material) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat ?? matZone)
        m.rotation.x = -Math.PI / 2
        m.position.set(x, 0.01, z)
        return m
      }

      function createText(text: string, x: number, y: number, z: number, size = 2) {
        const canvas = document.createElement('canvas')
        canvas.width = 512
        canvas.height = 128
        const ctx = canvas.getContext('2d')
        if (!ctx) return new THREE.Mesh()
        ctx.clearRect(0, 0, 512, 128)
        ctx.font = 'bold 60px Courier New'
        ctx.fillStyle = '#86198f'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(text, 256, 64)
        const tex = new THREE.CanvasTexture(canvas)
        tex.minFilter = THREE.LinearFilter
        const m = new THREE.Mesh(
          new THREE.PlaneGeometry(size * 4, size),
          new THREE.MeshBasicMaterial({
            map: tex,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide,
          }),
        )
        m.position.set(x, y, z)
        m.rotation.x = -Math.PI / 2
        return m
      }

      function createTrussSegment(x: number, y: number, z: number, height: number) {
        const group = new THREE.Group()
        group.add(volBox(0.5, height, 0.5, x, y + height / 2, z, matGlass, matMain))
        for (let i = 0; i < height; i += 2) {
          group.add(
            solidLine(
              new THREE.Vector3(x - 0.3, y + i, z),
              new THREE.Vector3(x + 0.3, y + i + 2, z),
              matSub,
            ),
          )
          group.add(
            solidLine(
              new THREE.Vector3(x + 0.3, y + i, z),
              new THREE.Vector3(x - 0.3, y + i + 2, z),
              matSub,
            ),
          )
        }
        return group
      }

      // FURNITURE GENERATORS
      function createBanquetChair(x: number, z: number, rotY: number, yBase = 0) {
        const g = new THREE.Group()
        g.add(volBox(0.5, 0.1, 0.5, 0, 0.25, 0, matVolume, matAccent))
        g.add(volBox(0.5, 0.8, 0.1, 0, 0.7, -0.2, matVolume, matAccent))
        g.position.set(x, yBase, z)
        g.rotation.y = rotY
        return g
      }

      function createBarStool(x: number, z: number, yBase = 0) {
        const g = new THREE.Group()
        g.add(volCyl(0.1, 0.1, 1, 0, 0, matVolume, matSub, 0.5))
        g.add(volCyl(0.3, 0.3, 0.1, 0, 0, matVolumeAccent, matAccent, 1.0))
        g.position.set(x, yBase, z)
        return g
      }

      function createLoungeSofa(x: number, z: number, rotY: number, yBase = 0) {
        const g = new THREE.Group()
        g.add(volBox(4, 0.5, 1.5, 0, 0.25, 0, matVolume, matMain))
        g.add(volBox(4, 0.8, 0.3, 0, 0.9, -0.6, matVolume, matMain))
        g.add(volBox(0.3, 0.8, 1.5, -2, 0.9, 0, matVolume, matMain))
        g.add(volBox(0.3, 0.8, 1.5, 2, 0.9, 0, matVolume, matMain))
        g.position.set(x, yBase, z)
        g.rotation.y = rotY
        return g
      }

      function createPlanter(x: number, z: number) {
        const g = new THREE.Group()
        g.add(volCyl(0.8, 0.8, 0.6, 0, 0, matVolume, matMain, 0.3))
        g.add(volCyl(0.4, 0.6, 1.5, 0, 0, matVolumeAccent, matAccent, 1.35))
        g.add(volCyl(0.2, 0.4, 1, 0.3, 0.3, matVolumeAccent, matAccent, 1.5))
        g.add(volCyl(0.2, 0.4, 1, -0.3, 0.3, matVolumeAccent, matAccent, 1.5))
        g.position.set(x, 0, z)
        return g
      }

      function createFoodTruck(x: number, z: number, rotY: number) {
        const g = new THREE.Group()
        g.add(volBox(6, 4, 10, 0, 2, 0, matVolume, matStruct))
        g.add(volBox(6, 1, 3, 0, 3, -2, matGlass, matAccent))
        g.add(volBox(6, 0.1, 3, 0, 2.5, -3.5, matVolumeAccent, matAccent))
        // Source HTML passes `0.5` (a number) in the material slot for the
        // wheels — see volCyl above for the coercion note.
        g.add(volCyl(0.8, 0.8, 0.5, -3, -3, 0.5))
        g.add(volCyl(0.8, 0.8, 0.5, 3, -3, 0.5))
        g.position.set(x, 0, z)
        g.rotation.y = rotY
        return g
      }

      function createTotem(x: number, z: number) {
        const g = new THREE.Group()
        g.add(volBox(0.5, 8, 0.5, 0, 4, 0, matVolume, matMain))
        g.add(volBox(2, 3, 0.2, 0, 6, 0.3, matVolumeAccent, matAccent))
        g.position.set(x, 0, z)
        return g
      }

      function createPicnicTable(x: number, z: number) {
        const g = new THREE.Group()
        g.add(volBox(3, 0.2, 1.5, 0, 0.8, 0, matVolume, matMain))
        g.add(volBox(0.2, 0.8, 1.5, -1, 0.4, 0, matVolume, matSub))
        g.add(volBox(0.2, 0.8, 1.5, 1, 0.4, 0, matVolume, matSub))
        g.add(volBox(3, 0.2, 0.5, -1.2, 0.5, 0, matVolume, matSub))
        g.add(volBox(3, 0.2, 0.5, 1.2, 0.5, 0, matVolume, matSub))
        g.position.set(x, 0, z)
        return g
      }

      function createStringLights(x1: number, z1: number, x2: number, z2: number, h: number) {
        const g = new THREE.Group()
        g.add(volCyl(0.1, 0.1, h, x1, z1, matVolume, matMain, h / 2))
        g.add(volCyl(0.1, 0.1, h, x2, z2, matVolume, matMain, h / 2))
        const midX = (x1 + x2) / 2
        const midZ = (z1 + z2) / 2
        const curve = new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(x1, h, z1),
          new THREE.Vector3(midX, h - 2, midZ),
          new THREE.Vector3(x2, h, z2),
        )
        const points = curve.getPoints(20)
        g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), matAccent))
        for (let i = 0.1; i < 0.9; i += 0.2) {
          const p = curve.getPoint(i)
          g.add(volCyl(0.15, 0.15, 0.3, p.x, p.z, matVolumeAccent, matAccent, p.y))
        }
        return g
      }

      function createTurnstile(x: number, z: number) {
        const g = new THREE.Group()
        g.add(volBox(1, 1, 1, 0, 0.5, 0, matVolume, matMain))
        g.add(volCyl(0.1, 0.1, 1.5, 0, 0, matVolumeAccent, matAccent, 0.75))
        for (let i = 0; i < 3; i++) {
          const rot = (i / 3) * Math.PI * 2
          g.add(
            volBox(
              0.8,
              0.1,
              0.2,
              Math.cos(rot) * 0.4,
              Math.sin(rot) * 0.4 + 1.5,
              0,
              matVolume,
              matAccent,
            ),
          )
        }
        g.position.set(x, 0, z)
        return g
      }

      function createCenterpiece(x: number, z: number) {
        const g = new THREE.Group()
        g.add(volCyl(0.2, 0.3, 1.5, 0, 0, matGlass, matMain, 0.75))
        g.add(volCyl(0.5, 0.2, 0.8, 0, 0, matVolumeAccent, matAccent, 1.9))
        g.position.set(x, 1, z)
        return g
      }

      // ============================================
      // 1. BASE GRID
      // ============================================
      const gridGroup = new THREE.Group()
      scene.add(gridGroup)
      const grid = new THREE.GridHelper(200, 50, 0xa21caf, 0xfbcfe8)
      const gridMat = grid.material
      if (Array.isArray(gridMat)) {
        gridMat.forEach((m) => {
          m.transparent = true
          m.opacity = 0.3
        })
      } else {
        gridMat.transparent = true
        gridMat.opacity = 0.3
      }
      gridGroup.add(grid)

      // ============================================
      // 2. EVENT ARCHITECTURE & PRODUCTION
      // ============================================
      const archGroup = new THREE.Group()
      scene.add(archGroup)

      // --- MAIN STAGE ---
      const stageZ = -40,
        stageW = 40
      archGroup.add(createZone(stageW + 10, 25, 0, stageZ + 5))
      archGroup.add(volBox(stageW, 2, 15, 0, 1, stageZ, matVolumeAccent, matStruct))
      archGroup.add(createText('MAIN STAGE', 0, 2.1, stageZ + 8, 3))
      archGroup.add(volBox(stageW - 4, 12, 0.5, 0, 8, stageZ - 8, matVolume, matStruct))
      archGroup.add(createTrussSegment(-stageW / 2, 2, stageZ - 8, 18))
      archGroup.add(createTrussSegment(stageW / 2, 2, stageZ - 8, 18))
      archGroup.add(volBox(stageW, 1, 1, 0, 20, stageZ - 8, matGlass, matStruct))
      archGroup.add(volBox(6, 0.5, 5, 0, 2.25, stageZ + 4, matVolume, matAccent))
      ;[-4, 4].forEach((mx) => {
        archGroup.add(volBox(0.1, 2, 0.1, mx, 3, stageZ + 8, matVolume, matAccent))
      })
      for (let mb = -15; mb <= 15; mb += 3) {
        archGroup.add(volBox(3, 1.2, 1, mb, 0.6, stageZ + 13, matVolume, matAccent))
      }

      // --- FOH & DANCEFLOOR ---
      const danceZ = -20
      archGroup.add(createZone(30, 40, 0, danceZ + 10))
      archGroup.add(createText('DANCEFLOOR', 0, 0.1, danceZ + 10, 2.5))
      archGroup.add(volBox(5, 1.5, 2, 0, 0.75, danceZ + 2, matVolumeAccent, matAccent))
      archGroup.add(createText('DJ', 0, 1.8, danceZ + 2, 1.2))

      ;[-15, 15].forEach((dx) => {
        archGroup.add(createTrussSegment(dx, 0, danceZ + 15, 15))
        archGroup.add(volBox(2, 4, 2, dx, 12, danceZ + 15, matVolumeAccent, matAccent))
      })

      const crowdGeo = new THREE.BufferGeometry()
      const crowdPts: number[] = []
      for (let i = 0; i < 120; i++) {
        crowdPts.push((Math.random() - 0.5) * 28, 0.5, danceZ + 10 + (Math.random() - 0.5) * 25)
      }
      crowdGeo.setAttribute('position', new THREE.Float32BufferAttribute(crowdPts, 3))
      const crowdMat = new THREE.PointsMaterial({
        color: 0xd946ef,
        size: 0.8,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
      })
      archGroup.add(new THREE.Points(crowdGeo, crowdMat))

      const fohZ = 15
      archGroup.add(volBox(8, 3, 5, 0, 1.5, fohZ, matVolume, matMain))
      archGroup.add(createText('FOH CONTROL', 0, 3.2, fohZ, 1.5))
      archGroup.add(volBox(2, 1, 2, -12, 0.5, fohZ, matVolume, matAccent))
      archGroup.add(volBox(0.2, 8, 0.2, -12, 4.5, fohZ, matVolume, matAccent))
      archGroup.add(
        solidLine(new THREE.Vector3(-12, 8, fohZ), new THREE.Vector3(0, 2, fohZ - 10), matAccent),
      )
      archGroup.add(volBox(1, 1, 1, 0, 1.5, fohZ - 10, matVolumeAccent, matAccent))

      // --- VIP PLATFORMS ---
      ;[-1, 1].forEach((side) => {
        const vx = side * 35,
          vz = -10
        archGroup.add(createZone(14, 18, vx, vz))
        archGroup.add(createZone(12, 16, vx, vz - 1, matRug))
        archGroup.add(volBox(14, 1, 18, vx, 0.5, vz, matVolumeAccent, matMain))
        for (let s = 1; s <= 3; s++) {
          archGroup.add(volBox(3, 0.3, 1, vx, 0.15 * s, vz + 9 + s * 1, matVolume, matSub))
        }
        archGroup.add(
          createLoungeSofa(vx - 4, vz - 6, side === 1 ? Math.PI / 2 : -Math.PI / 2, 1.0),
        )
        archGroup.add(volCyl(1, 1, 0.5, vx, vz, matVolume, matAccent, 1.25))
        archGroup.add(volCyl(0.1, 0.1, 1.5, vx - 4, vz + 5, matVolume, matSub, 1.75))
        archGroup.add(volCyl(0.8, 0.8, 0.1, vx - 4, vz + 5, matGlass, matAccent, 2.5))
        archGroup.add(createBarStool(vx - 5, vz + 5, 1.0))
        archGroup.add(createBarStool(vx - 3, vz + 5, 1.0))
        for (let r = -3; r <= 3; r += 2) {
          archGroup.add(volCyl(0.1, 0.1, 1.2, vx + r, vz + 8, matVolume, matAccent, 1.6))
          if (r < 3)
            archGroup.add(
              dashedLine(
                new THREE.Vector3(vx + r, 1.6, vz + 8),
                new THREE.Vector3(vx + r + 2, 1.6, vz + 8),
              ),
            )
        }
        archGroup.add(volBox(14, 0.3, 18, vx, 6, vz, matGlass, matSub))
        archGroup.add(createText('VIP', vx, 1.2, vz + 8, 2))
      })

      // --- GUEST TABLES ---
      const tPos: [number, number][] = [
        [-20, 10],
        [0, 10],
        [20, 10],
        [-20, 25],
        [0, 25],
        [20, 25],
      ]
      tPos.forEach(([tx, tz]) => {
        archGroup.add(createZone(8, 8, tx, tz, matRug))
        archGroup.add(volCyl(2, 2, 1, tx, tz, matVolume, matMain))
        archGroup.add(createCenterpiece(tx, tz))
        for (let ci = 0; ci < 8; ci++) {
          const ang = (ci / 8) * Math.PI * 2
          archGroup.add(
            createBanquetChair(tx + Math.cos(ang) * 3.5, tz + Math.sin(ang) * 3.5, -ang),
          )
        }
      })

      // --- MAIN BAR & CATERING ---
      const barZ = 40
      archGroup.add(createZone(30, 12, 20, barZ))
      archGroup.add(volBox(20, 1.5, 2, 20, 0.75, barZ, matVolume, matStruct))
      archGroup.add(volBox(20, 4, 1, 20, 3, barZ + 2, matGlass, matMain))
      for (let bx = 12; bx <= 28; bx += 1.5) {
        archGroup.add(volCyl(0.15, 0.15, 0.4, bx, barZ, matGlass, matAccent, 1.7))
        archGroup.add(volCyl(0.15, 0.15, 1, bx, barZ + 2, matVolumeAccent, matAccent))
        archGroup.add(
          solidLine(
            new THREE.Vector3(bx, 4.5, barZ + 2),
            new THREE.Vector3(bx, 6, barZ + 2),
            matHidden,
          ),
        )
        archGroup.add(volCyl(0.3, 0.3, 0.4, bx, barZ + 2, matVolumeAccent, matAccent, 4.7))
      }
      archGroup.add(createBanquetChair(15, barZ - 1.5, Math.PI, 0.75))
      archGroup.add(createBanquetChair(25, barZ - 1.5, Math.PI, 0.75))
      for (let sx = 12; sx <= 28; sx += 3) {
        archGroup.add(createBarStool(sx, barZ - 3))
      }
      archGroup.add(createText('MAIN BAR', 20, 2.2, barZ, 2.5))

      archGroup.add(createFoodTruck(-20, barZ + 10, 0))
      archGroup.add(createFoodTruck(-10, barZ + 10, 0))
      archGroup.add(createFoodTruck(0, barZ + 10, 0))
      archGroup.add(createText('FOOD TRUCKS', -10, 4.2, barZ + 10, 2))
      archGroup.add(createPicnicTable(-25, barZ + 15))
      archGroup.add(createPicnicTable(-15, barZ + 15))
      archGroup.add(createPicnicTable(-5, barZ + 15))
      archGroup.add(createPicnicTable(5, barZ + 15))
      archGroup.add(createStringLights(-30, barZ + 5, 10, barZ + 5, 8))
      archGroup.add(createStringLights(-30, barZ + 20, 10, barZ + 20, 8))

      // --- ENTRANCE PLAZA ---
      const entZ = 60
      archGroup.add(createZone(40, 15, 0, entZ))
      archGroup.add(volBox(25, 10, 1, 0, 5, entZ, matVolumeAccent, matStruct))
      archGroup.add(volBox(1, 10, 1, -12, 5, entZ, matVolume, matStruct))
      archGroup.add(volBox(1, 10, 1, 12, 5, entZ, matVolume, matStruct))
      archGroup.add(createText('ENTRANCE', 0, 10.2, entZ, 2.5))
      archGroup.add(volBox(4, 3, 4, -15, 1.5, entZ - 2, matVolume, matMain))
      archGroup.add(volBox(4, 3, 4, 15, 1.5, entZ - 2, matVolume, matMain))
      archGroup.add(createTurnstile(-5, entZ - 2))
      archGroup.add(createTurnstile(0, entZ - 2))
      archGroup.add(createTurnstile(5, entZ - 2))
      archGroup.add(volCyl(0.2, 0.3, 12, -18, entZ - 5, matVolume, matMain, 6))
      archGroup.add(volBox(3, 2, 0.2, -16.5, 10, entZ - 5, matVolumeAccent, matAccent))
      archGroup.add(volCyl(0.2, 0.3, 12, 18, entZ - 5, matVolume, matMain, 6))
      archGroup.add(volBox(3, 2, 0.2, 19.5, 10, entZ - 5, matVolumeAccent, matAccent))
      archGroup.add(createPlanter(-12, entZ - 3))
      archGroup.add(createPlanter(12, entZ - 3))
      archGroup.add(createTotem(-25, entZ - 5))
      archGroup.add(createTotem(25, entZ - 5))

      // --- BACKSTAGE & GENERATORS ---
      archGroup.add(volBox(12, 5, 4, -35, 2.5, -45, matVolumeAccent, matMain))
      archGroup.add(volBox(6, 4, 4, -25, 2, -50, matVolumeAccent, matAccent))
      archGroup.add(volBox(6, 4, 4, 25, 2, -50, matVolumeAccent, matAccent))

      // --- RESTROOMS ---
      for (let r = 0; r < 5; r++) {
        archGroup.add(volBox(3, 4, 6, -40 - 4.5 + r * 3, 2, 30, matVolume, matMain))
      }

      // --- LANDSCAPE & BOLLARDS ---
      for (let b = -40; b <= 40; b += 8) {
        archGroup.add(volCyl(0.2, 0.2, 0.8, b, 50, matVolume, matAccent, 0.4))
      }

      // ============================================
      // 3. HOLO UI NODES
      // ============================================
      const nodesGroup = new THREE.Group()
      scene.add(nodesGroup)

      function createNode(x: number, z: number, label: string) {
        const g = new THREE.Group()
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(1.5, 1.7, 32),
          new THREE.MeshBasicMaterial({
            color: 0xd946ef,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide,
          }),
        )
        ring.rotation.x = -Math.PI / 2
        ring.position.y = 0.12
        g.add(ring)
        const line = dashedLine(new THREE.Vector3(0, 0.1, 0), new THREE.Vector3(0, 15, 0))
        g.add(line)
        const sphere = new THREE.Mesh(
          new THREE.SphereGeometry(0.6, 16, 16),
          new THREE.MeshBasicMaterial({ color: 0xd946ef, transparent: true, opacity: 0.9 }),
        )
        sphere.position.y = 15
        g.add(sphere)
        const txt = createText(label, 0, 16, 0, 1.5)
        g.add(txt)
        g.position.set(x, 0, z)
        g.userData.ring = ring
        g.userData.sphere = sphere
        nodesGroup.add(g)
      }
      createNode(0, -35, 'STAGE A')
      createNode(0, 15, 'FOH')
      createNode(35, -10, 'VIP A')
      createNode(20, 40, 'BAR')
      createNode(0, 60, 'ENTRY')

      // ============================================
      // BUILD ANIMATION SYSTEM SETUP
      // ============================================
      function easeOutElastic(x: number) {
        const c4 = (2 * Math.PI) / 3
        return x === 0 ? 0 : x === 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1
      }
      function easeOutCubic(x: number) {
        return 1 - Math.pow(1 - x, 3)
      }

      const buildTargets: THREE.Object3D[] = []
      const groupsToProcess: THREE.Group[] = [archGroup, nodesGroup]
      groupsToProcess.forEach((group) => {
        group.children.forEach((child) => {
          child.userData.baseX = child.position.x
          child.userData.baseY = child.position.y
          child.userData.baseZ = child.position.z
          child.userData.baseScale = child.scale.clone()
          child.userData.baseRotZ = child.rotation.z

          const zPos = child.position.z || 0
          const zNorm = THREE.MathUtils.clamp((70 - zPos) / 120, 0, 1)
          // Speeding up build delay slightly to match faster camera
          child.userData.buildDelay = zNorm * 3.5 + Math.random() * 0.3
          child.userData.buildDuration = 1.2 + Math.random() * 0.3

          child.scale.set(0.001, 0.001, 0.001)
          child.position.y = child.userData.baseY - 5
          child.rotation.z = child.userData.baseRotZ + Math.PI / 6

          buildTargets.push(child)
        })
      })

      // ============================================
      // v42 SMOOTHNESS FIX — STATIC STRUCTURE MERGE
      // ============================================
      // The scene is a 1:1 conversion of an HTML prototype that
      // instantiated ~300 groups → ~700+ draw calls (every volBox = a fill
      // Mesh + an edge LineSegments). On real GPUs that is merely wasteful;
      // on software rasterizers (and weak iGPUs) it is catastrophic (~5 FPS
      // measured under SwiftShader at 1440×900).
      //
      // Once every build-in animation has finished the event layout is
      // static forever, so we bake each object's world transform into its
      // geometry and merge by material:
      //   • 5 fill materials → 5 merged Meshes
      //   • 4 line materials → 4 merged LineSegments (strips → point pairs)
      // ≈35 draw calls total, pixel-identical geometry.
      //
      // Excluded from merging (animated / unique):
      //   crowd Points, nodesGroup (ring pulse + sphere bob), text sprites
      //   (unique canvas textures), the GridHelper.
      const mergeableRoots: THREE.Object3D[] = []
      archGroup.children.forEach((child) => {
        // Root-level crowd Points stay live (per-frame vertex animation).
        if (child instanceof THREE.Points) return
        // Root-level text sprites carry unique textures — keep as objects.
        const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial | undefined
        if (mat?.map) return
        // Safety: any root containing live Points or texture sprites is
        // skipped entirely (left untouched as its own object).
        let skip = false
        child.traverse((o) => {
          if (o instanceof THREE.Points) skip = true
          const m = (o as THREE.Mesh).material as THREE.MeshBasicMaterial | undefined
          if (m?.map) skip = true
        })
        if (!skip) mergeableRoots.push(child)
      })

      if (isSoftware) {
        // Software rasterizer: a 6-second hologram build-in at ~5 FPS looks
        // far worse than skipping it — snap every object to its built state
        // and merge before the first render. The cinematic camera intro is
        // time-based and still runs.
        buildTargets.forEach((item) => {
          item.userData.isBuilt = true
          item.scale.copy(item.userData.baseScale)
          item.position.set(item.userData.baseX, item.userData.baseY, item.userData.baseZ)
          item.rotation.z = item.userData.baseRotZ
        })
      }

      // Convert a Line (strip) into the equivalent LineSegments geometry of
      // consecutive point pairs. Preserves the cumulative `lineDistance`
      // attribute when present so dashed materials keep their exact pattern
      // (a dash phase is stored per vertex as distance from strip start).
      function lineToSegmentPairs(geo: THREE.BufferGeometry): THREE.BufferGeometry {
        const pos = geo.getAttribute('position') as THREE.BufferAttribute
        const dist = geo.getAttribute('lineDistance') as THREE.BufferAttribute | undefined
        const pts: number[] = []
        const ds: number[] = []
        for (let i = 0; i + 1 < pos.count; i++) {
          pts.push(pos.getX(i), pos.getY(i), pos.getZ(i))
          pts.push(pos.getX(i + 1), pos.getY(i + 1), pos.getZ(i + 1))
          if (dist) {
            ds.push(dist.getX(i), dist.getX(i + 1))
          }
        }
        const out = new THREE.BufferGeometry()
        out.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
        if (dist) {
          out.setAttribute('lineDistance', new THREE.Float32BufferAttribute(ds, 1))
        }
        return out
      }

      let staticMerged = false

      function mergeStaticStructure() {
        if (staticMerged) return
        staticMerged = true

        const fillBuckets = new Map<THREE.Material, THREE.BufferGeometry[]>()
        const lineBuckets = new Map<THREE.Material, THREE.BufferGeometry[]>()

        mergeableRoots.forEach((root) => {
          root.updateMatrixWorld(true)
          root.traverse((obj) => {
            if (obj instanceof THREE.Line) {
              const mat = obj.material as THREE.Material
              const geo = lineToSegmentPairs(obj.geometry)
              // LineDashedMaterial without a lineDistance attribute renders
              // solid (distance 0 → mod() < dashSize → never discards).
              // Zero-fill it so merged behavior matches current behavior
              // exactly; real dashed lines carry their attribute through.
              if ((mat as THREE.LineDashedMaterial).isLineDashedMaterial && !geo.getAttribute('lineDistance')) {
                const n = geo.getAttribute('position').count
                geo.setAttribute('lineDistance', new THREE.Float32BufferAttribute(new Float32Array(n), 1))
              }
              geo.applyMatrix4(obj.matrixWorld)
              let bucket = lineBuckets.get(mat)
              if (!bucket) {
                bucket = []
                lineBuckets.set(mat, bucket)
              }
              bucket.push(geo)
            } else if (obj instanceof THREE.LineSegments) {
              const mat = obj.material as THREE.Material
              const geo = obj.geometry.clone()
              if ((mat as THREE.LineDashedMaterial).isLineDashedMaterial && !geo.getAttribute('lineDistance')) {
                const n = geo.getAttribute('position').count
                geo.setAttribute('lineDistance', new THREE.Float32BufferAttribute(new Float32Array(n), 1))
              }
              geo.applyMatrix4(obj.matrixWorld)
              let bucket = lineBuckets.get(mat)
              if (!bucket) {
                bucket = []
                lineBuckets.set(mat, bucket)
              }
              bucket.push(geo)
            } else if (obj instanceof THREE.Mesh) {
              const mat = obj.material as THREE.Material
              const geo = obj.geometry.clone()
              geo.applyMatrix4(obj.matrixWorld)
              let bucket = fillBuckets.get(mat)
              if (!bucket) {
                bucket = []
                fillBuckets.set(mat, bucket)
              }
              bucket.push(geo)
            }
          })
        })

        // Swap the originals for the merged batches.
        mergeableRoots.forEach((root) => {
          archGroup.remove(root)
          // Free the now-redundant GPU buffers (geometries only — the
          // materials are shared and live on inside the merged meshes).
          root.traverse((o) => {
            const mesh = o as THREE.Mesh
            mesh.geometry?.dispose()
          })
        })

        fillBuckets.forEach((geos, mat) => {
          const merged = mergeGeometries(geos, false)
          geos.forEach((g) => g.dispose())
          if (!merged) return
          // Transparent architectural volumes: disabling depth write on the
          // merged batch reproduces the layered hologram blending (every
          // surface shows through, like the per-object sorted renders did)
          // instead of per-triangle depth rejection, which would punch
          // holes inside one batch.
          mat.depthWrite = false
          const mesh = new THREE.Mesh(merged, mat)
          mesh.matrixAutoUpdate = false
          archGroup.add(mesh)
        })
        lineBuckets.forEach((geos, mat) => {
          const merged = mergeGeometries(geos, false)
          geos.forEach((g) => g.dispose())
          if (!merged) return
          const seg = new THREE.LineSegments(merged, mat)
          seg.matrixAutoUpdate = false
          archGroup.add(seg)
        })
      }

      if (isSoftware) mergeStaticStructure()

      // ============================================
      // SEAMLESS CINEMATIC CAMERA SPLINE
      // ============================================
      // Adjusted path points to accommodate faster speed while maintaining smoothness.
      // v41-g2-F2 Fix #4: scale the horizontal (x/z) camPath coordinates by
      // a mobile pull-back factor so the cinematic intro also sits further
      // from the action on small screens (matches the wider mobile FOV).
      // y values are untouched — vertical height is independent of FOV
      // pull-back and the existing y arc reads fine on both layouts.
      const camPullback = isMobile ? 1.15 : 1
      const camPath = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0 * camPullback, 18, 95 * camPullback), // Start slightly higher
        new THREE.Vector3(8 * camPullback, 22, 50 * camPullback), // Quick dive through entrance
        new THREE.Vector3(15 * camPullback, 28, 0), // Sweep past FOH/Tables
        new THREE.Vector3(-10 * camPullback, 45, -20 * camPullback), // Quick rise and turn
        new THREE.Vector3(-25 * camPullback, 65, 40 * camPullback), // Arc back
        new THREE.Vector3(0, 75, 95 * camPullback), // Orbit start point
      ])

      const lookPath = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 2, 60),
        new THREE.Vector3(0, 2, 30),
        new THREE.Vector3(0, 2, -10),
        new THREE.Vector3(0, 5, -20),
        new THREE.Vector3(0, 5, 20),
        new THREE.Vector3(0, 0, 0),
      ])

      // REDUCED from 8.0 to 6.0 seconds as requested
      const introDuration = 6.0
      const pos = new THREE.Vector3()
      const look = new THREE.Vector3()

      // ============================================
      // ANIMATION LOOP
      // ============================================
      const clock = new THREE.Clock()
      let animFrameId = 0

      // v42: software rasterizers render the canvas at 30Hz (every 2nd
      // rAF). The camera orbit is very slow (a full circuit takes minutes),
      // so halving the canvas cadence is visually lossless while halving
      // both rasterization and compositing work. Real GPUs render at 60Hz.
      const renderInterval = isSoftware ? 2 : 1
      let frameCounter = 0

      // v42: adaptive resolution watchdog — protects weak iGPUs and software
      // rasterizers. Sustained FPS below the threshold steps the render
      // resolution down (floor 0.55); sustained FPS > 50 steps it back up
      // (ceiling 1.0). 4-second cooldown between steps prevents oscillation.
      // The threshold is lower on software renderers because the 30Hz cap
      // already bounds the measured rate.
      const lowFpsThreshold = isSoftware ? 20 : 24
      let fpsFrames = 0
      let fpsWindowStart = -1
      let lastScaleChange = -10

      function animate() {
        animFrameId = requestAnimationFrame(animate)
        frameCounter++
        if (renderInterval > 1 && frameCounter % renderInterval !== 0) return
        const t = clock.getElapsedTime()

        // v42: merge the static structure the moment every build-in has
        // finished (the event layout is then frozen forever). Software
        // rasterizers already merged during setup above.
        if (!staticMerged && buildTargets.length > 0) {
          let allBuilt = true
          for (let i = 0; i < buildTargets.length; i++) {
            if (!buildTargets[i].userData.isBuilt) {
              allBuilt = false
              break
            }
          }
          if (allBuilt) mergeStaticStructure()
        }

        // v42: adaptive resolution watchdog (counts rendered frames only,
        // so the 30Hz software cap is not mistaken for a slowdown).
        if (fpsWindowStart < 0) fpsWindowStart = t
        fpsFrames++
        const windowSpan = t - fpsWindowStart
        if (windowSpan >= 2) {
          const fps = fpsFrames / windowSpan
          if (t - lastScaleChange > 4) {
            if (fps < lowFpsThreshold && pixelScale > 0.55) {
              pixelScale = Math.max(0.55, pixelScale - 0.2)
              applyPixelScale()
              lastScaleChange = t
            } else if (fps > 50 && pixelScale < 1.0) {
              pixelScale = Math.min(1.0, pixelScale + 0.15)
              applyPixelScale()
              lastScaleChange = t
            }
          }
          fpsFrames = 0
          fpsWindowStart = t
        }

        // 1. Update Build Animations
        for (let i = 0; i < buildTargets.length; i++) {
          const item = buildTargets[i]
          if (item.userData.isBuilt) continue

          let progress: number = (t - item.userData.buildDelay) / item.userData.buildDuration
          if (progress >= 1) {
            progress = 1
            item.userData.isBuilt = true
            item.scale.copy(item.userData.baseScale)
            item.position.set(item.userData.baseX, item.userData.baseY, item.userData.baseZ)
            item.rotation.z = item.userData.baseRotZ
          } else if (progress > 0) {
            const s = easeOutElastic(progress)
            item.scale.set(
              item.userData.baseScale.x * s,
              item.userData.baseScale.y * s,
              item.userData.baseScale.z * s,
            )
            const p = easeOutCubic(progress)
            item.position.y = item.userData.baseY - 5 + 5 * p
            item.rotation.z = item.userData.baseRotZ + (Math.PI / 6) * (1 - p)

            // Hologram Glitch Effect
            if (progress < 0.4) {
              const glitch = (0.4 - progress) * 2
              item.position.x = item.userData.baseX + (Math.random() - 0.5) * glitch * 0.5
              item.position.z = item.userData.baseZ + (Math.random() - 0.5) * glitch * 0.5
            } else {
              item.position.x = item.userData.baseX
              item.position.z = item.userData.baseZ
            }
          }
        }

        // 2. Animate Crowd
        archGroup.children.forEach((c) => {
          if (c instanceof THREE.Points) {
            const attr = c.geometry.attributes.position as THREE.BufferAttribute
            const arr = attr.array as Float32Array
            for (let i = 1; i < arr.length; i += 3) {
              arr[i] = 0.5 + Math.sin(t * 2 + i) * 0.3
            }
            attr.needsUpdate = true
          }
        })

        // 3. Animate UI Nodes
        nodesGroup.children.forEach((n) => {
          if (n.userData.sphere) {
            n.userData.sphere.position.y = 15 + Math.sin(t * 1.5) * 0.5
            n.userData.ring.scale.setScalar(1 + Math.sin(t * 2) * 0.2)
          }
        })

        // 4. SEAMLESS CAMERA LOGIC (Faster Intro, Same Orbit)
        // v41-g2-F2 Fix #4: orbit (phase 3) uses a wider radius on mobile
        // (110 vs 95) so the continuous loop also benefits from the
        // pull-back and the wider FOV doesn't crop the lounge edges.
        // lookAt stays at origin so the lounge remains centered.
        const orbitRadius = isMobile ? 110 : 95
        if (t < introDuration) {
          const u = t / introDuration
          pos.copy(camPath.getPoint(u))
          look.copy(lookPath.getPoint(u))
        } else {
          // Continuous Orbit (Remains exactly the same)
          const ot = t - introDuration
          pos.set(
            Math.sin(ot * 0.025) * orbitRadius,
            75 + Math.sin(ot * 0.04) * 5,
            Math.cos(ot * 0.025) * orbitRadius,
          )
          look.set(0, 0, 0)
        }

        camera.position.copy(pos)
        camera.lookAt(look)

        renderer.render(scene, camera)
      }
      animate()

      // ============================================
      // RESIZE HANDLER
      // ============================================
      function onResize() {
        camera.aspect = window.innerWidth / window.innerHeight
        camera.updateProjectionMatrix()
        renderer.setPixelRatio(baseDpr * pixelScale)
        renderer.setSize(window.innerWidth, window.innerHeight)
      }
      window.addEventListener('resize', onResize)

      // v45: pause the loop when the tab itself is hidden — the browser stops
      // firing rAF anyway, but an explicit cancel + restart keeps the clock
      // from lurching on return. Swallowing the hidden time means the
      // camera spline/orbit phases resume exactly where they paused instead
      // of teleporting across the orbit (t jumps were the off-screen cost
      // of an unmanaged clock).
      const onVisibility = () => {
        if (document.hidden) {
          cancelAnimationFrame(animFrameId)
          animFrameId = 0
        } else if (animFrameId === 0) {
          // Only restart when the loop is NOT already scheduled (guards the
          // page-loaded-while-hidden case, where the initial animate() call
          // already queued a rAF that the browser will fire on reveal).
          // getDelta() consumes AND accumulates the hidden span into
          // elapsedTime — subtract it back so time-based phases stand still.
          clock.elapsedTime -= clock.getDelta()
          animate()
        }
      }
      document.addEventListener('visibilitychange', onVisibility)

      // ============================================
      // CLEANUP (returned to React for unmount)
      // ============================================
      cleanup = () => {
        cancelAnimationFrame(animFrameId)
        window.removeEventListener('resize', onResize)
        document.removeEventListener('visibilitychange', onVisibility)
        // v41-g2-F1 Fix #2: traverse the scene graph to dispose geometries /
        // materials before tearing down the renderer. scene.clear() only
        // detaches objects — it does NOT free GPU buffers, so without this
        // loop the WebGL context leaks memory on every route change / Strict
        // Mode double-mount.
        scene.traverse((obj) => {
          // v43 leak fix: dispose EVERY GPU-backed node, not just meshes.
          // The lounge is built mostly from LineSegments / Line edges and a
          // crowd of Points — the previous `obj instanceof THREE.Mesh` filter
          // skipped all of them, leaking every EdgesGeometry / line
          // BufferGeometry, the crowd buffer, the five shared line materials
          // (matStruct/matMain/matSub/matAccent/matHidden) and crowdMat on
          // every unmount (twice under React StrictMode). Materials shared
          // with meshes get disposed more than once — a harmless no-op in
          // three.js.
          const node = obj as unknown as {
            geometry?: THREE.BufferGeometry
            material?: THREE.Material | THREE.Material[]
          }
          if (node.geometry) node.geometry.dispose()
          if (Array.isArray(node.material)) {
            node.material.forEach((m) => m.dispose())
          } else if (node.material) {
            node.material.dispose()
          }
        })
        renderer.dispose()
        scene.clear()
        if (renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement)
        }
      }
    } catch (error) {
      console.error(error)
    }

    return cleanup
  }, [])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  )
}
