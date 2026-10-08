import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { isSoftwareRenderer, shouldEnable3D } from '@/lib/device-capabilities';

// ============ SHADERS ============
const NEBULA_VERTEX = `
  varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}
`;

const NEBULA_FRAGMENT = `
  uniform float uTime,uOpacity; uniform vec3 uColor1,uColor2,uColor3; varying vec2 vUv;
  vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec2 mod289(vec2 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec3 permute(vec3 x){return mod289(((x*34.0)+1.0)*x);}
  float snoise(vec2 v){
    const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
    vec2 i=floor(v+dot(v,C.yy)); vec2 x0=v-i+dot(i,C.xx);
    vec2 i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);
    vec4 x12=x0.xyxy+C.xxzz; x12.xy-=i1; i=mod289(i);
    vec3 p=permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));
    vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);
    m=m*m; m=m*m;
    vec3 x=2.0*fract(p*C.www)-1.0; vec3 h=abs(x)-0.5; vec3 ox=floor(x+0.5); vec3 a0=x-ox;
    m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);
    vec3 g; g.x=a0.x*x0.x+h.x*x0.y; g.yz=a0.yz*x12.xz+h.yz*x12.yw;
    return 130.0*dot(m,g);
  }
  float fbm(vec2 p){float v=0.0,a=0.5;for(int i=0;i<6;i++){v+=a*snoise(p);p*=2.1;a*=0.47;}return v;}
  void main(){
    vec2 uv=vUv; float t=uTime*0.025;
    float n1=fbm(uv*2.2+vec2(t*0.8,t*0.5));
    float n2=fbm(uv*1.6-vec2(t*0.6,t*0.9));
    float n3=fbm(uv*3.0+vec2(t*0.3,-t*0.7));
    vec3 col=mix(uColor1,uColor2,n1*0.5+0.5);
    col=mix(col,uColor3,n2*0.35+0.15);
    float alpha=smoothstep(-0.3,0.5,n1)*smoothstep(-0.2,0.4,n3)*uOpacity;
    alpha*=(0.75+0.25*sin(uTime*0.15+n2*6.28));
    gl_FragColor=vec4(col*1.3,alpha);
  }
`;

const STAR_VERTEX = `
  attribute float aSize,aTwinkleSpeed,aTwinkleOffset,aDepthLayer;
  attribute vec3 aColor; uniform float uTime,uPixelRatio,uMouseX,uMouseY;
  varying vec3 vColor; varying float vTwinkle,vDist,vDepthLayer;
  void main(){
    vColor=aColor; vDepthLayer=aDepthLayer; vec3 pos=position;
    float ps=0.3+aDepthLayer*0.7;
    pos.x+=uMouseX*ps*(1.0+aDepthLayer*2.0); pos.y+=uMouseY*ps*(1.0+aDepthLayer*2.0);
    vec4 mv=modelViewMatrix*vec4(pos,1.0);
    float tw=sin(uTime*aTwinkleSpeed+aTwinkleOffset); tw=tw*tw; vTwinkle=tw;
    float sz=aSize*(350.0/max(-mv.z,1.0)); sz*=(0.85+tw*0.35);
    gl_PointSize=clamp(sz*uPixelRatio,0.5,40.0); gl_Position=projectionMatrix*mv; vDist=-mv.z;
  }
`;

const STAR_FRAGMENT = `
  varying vec3 vColor; varying float vTwinkle,vDist,vDepthLayer;
  void main(){
    vec2 c=gl_PointCoord-vec2(0.5); float d=length(c); if(d>0.5)discard;
    float glow=1.0-smoothstep(0.0,0.5,d); glow=pow(glow,2.0);
    float core=smoothstep(0.12,0.0,d);
    vec3 coreCol=vColor*(1.8+vTwinkle*0.7); vec3 haloCol=vColor*(0.4+vTwinkle*0.2);
    vec3 final=mix(haloCol,coreCol,core);
    float fade=smoothstep(150.0,20.0,vDist); float alpha=glow*(0.5+vTwinkle*0.4)*fade;
    if(vDepthLayer>0.5)alpha*=0.7;
    gl_FragColor=vec4(final,alpha);
  }
`;

const DUST_VERTEX = `
  attribute float aSize,aAlpha,aSpeed; uniform float uTime,uPixelRatio;
  varying float vAlpha,vDist;
  void main(){
    vec3 pos=position; pos.y+=sin(uTime*aSpeed+position.x)*0.5; pos.x+=cos(uTime*aSpeed*0.7+position.y)*0.3;
    vec4 mv=modelViewMatrix*vec4(pos,1.0); float sz=aSize*(200.0/max(-mv.z,1.0));
    gl_PointSize=clamp(sz*uPixelRatio,0.3,8.0); gl_Position=projectionMatrix*mv; vAlpha=aAlpha; vDist=-mv.z;
  }
`;

const DUST_FRAGMENT = `
  varying float vAlpha,vDist;
  void main(){
    vec2 c=gl_PointCoord-vec2(0.5); float d=length(c); if(d>0.5)discard;
    float glow=1.0-smoothstep(0.0,0.5,d); glow=pow(glow,1.5);
    float fade=smoothstep(80.0,10.0,vDist); float alpha=glow*vAlpha*fade*0.6;
    gl_FragColor=vec4(vec3(0.96,0.72,0.08),alpha);
  }
`;

// ============أنماط CSS ============
// (Only `container` survives — the old mobileView/controls/btn/overlay
// entries were leftovers from the source HTML conversion and were never
// referenced by the component.)
const styles = {
  container: {
    zIndex: 0,
    pointerEvents: "none" as const,
    position: 'absolute' as 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    transition: 'all 0.8s cubic-bezier(0.22, 1, 0.36, 1)',
    overflow: 'hidden',
    background: '#0E0D0B',
  },
};

// ============ المكون الرئيسي ============
const CosmicBackground: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // v42 smoothness fix: respect reduced-motion / no-WebGL / low-end
    // devices (the CSS fallback layers behind the canvas remain visible)
    // and detect software rasterizers — the nebula's 3× fbm shader (≈18
    // simplex-noise evaluations per pixel × 3 fullscreen planes) is by far
    // the dominant per-pixel cost and cannot run at interactive rates on a
    // CPU rasterizer (measured ~7 FPS under SwiftShader). Software devices
    // skip the nebula layers (pure starfield + dust + orbit rings remain),
    // cap the pixel ratio at 1 and render the canvas at 30Hz.
    if (!shouldEnable3D()) return;
    const isSoftware = isSoftwareRenderer();
    const renderInterval = isSoftware ? 2 : 1;
    let frameCounter = 0;

    let renderer: THREE.WebGLRenderer;
    let scene: THREE.Scene;
    let camera: THREE.PerspectiveCamera;
    let animId = 0;
    let nebMats: THREE.ShaderMaterial[] = [];
    let starMeshes: THREE.ShaderMaterial[] = [];
    let dustMat: THREE.ShaderMaterial;
    let dustGeo: THREE.BufferGeometry;
    let glowTex: THREE.CanvasTexture;
    // One orbital ring bundle: group + ring materials + pearl points data.
    type OrbitRing = {
      grp: THREE.Group;
      rMat: THREE.MeshBasicMaterial;
      gMat: THREE.MeshBasicMaterial;
      ogMat: THREE.MeshBasicMaterial;
      pGeo: THREE.BufferGeometry;
      pMat: THREE.PointsMaterial;
      pPos: Float32Array;
      pVel: Float32Array;
      baseOpacity: number;
    };
    let rings: OrbitRing[] = [];
    
    let mouseX = 0, mouseY = 0, tMX = 0, tMY = 0;
    let introProgress = 0;
    const clock = new THREE.Clock();

    const initScene = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      const isMobile = window.innerWidth < 768;
      // Software rasterizers also cap the total canvas width (the CSS
      // layout stretches the canvas back to 100% — a glowing star field is
      // visually unaffected by the soft upscale) so the additive-blend
      // fragment workload stays bounded on large screens: at 1440px wide
      // the uncapped starfield measured 11.5 FPS, at an 800px drawing
      // buffer it runs at full frame rate.
      const dpr = isSoftware
        ? Math.min(1.0, 800 / Math.max(window.innerWidth, 1))
        : Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2);

      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0E0D0B);
      scene.fog = new THREE.FogExp2(0x0E0D0B, 0.0);

      camera = new THREE.PerspectiveCamera(85, width / height, 0.1, 1000);
      camera.position.set(0, 5, 90);

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
      renderer.setSize(width, height);
      renderer.setPixelRatio(dpr);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.8;
      container.appendChild(renderer.domElement);

      scene.add(new THREE.AmbientLight(0x2A2418, 0.8));
      const gl = new THREE.PointLight(0xf5b914, 2.0, 150); gl.position.set(20, 15, 10); scene.add(gl);
      const pl = new THREE.PointLight(0xC9A24B, 1.8, 120); pl.position.set(-20, -15, -5); scene.add(pl);

      // Nebula (skipped entirely on software rasterizers — see the
      // isSoftware note at the top of the effect).
      const nebGroup = new THREE.Group(); scene.add(nebGroup);
      nebMats = [];
      const nebCfgs = isSoftware ? [] : [
        { c1: new THREE.Color(0x3A2F1A), c2: new THREE.Color(0xC9A25E), c3: new THREE.Color(0x2A2418), op: 0.09, pos: [0, 0, -40], rot: 0, sc: [60, 40, 1] },
        { c1: new THREE.Color(0x451a03), c2: new THREE.Color(0xf5b914), c3: new THREE.Color(0x78350f), op: 0.07, pos: [15, 10, -35], rot: 0.3, sc: [50, 35, 1] },
        { c1: new THREE.Color(0x3A2F1A), c2: new THREE.Color(0x8B6B3D), c3: new THREE.Color(0x0E0D0B), op: 0.08, pos: [-20, -10, -45], rot: -0.2, sc: [55, 38, 1] }
      ];
      nebCfgs.forEach(cfg => {
        const geo = new THREE.PlaneGeometry(1, 1, 1, 1);
        const mat = new THREE.ShaderMaterial({
          vertexShader: NEBULA_VERTEX, fragmentShader: NEBULA_FRAGMENT,
          uniforms: { uTime: { value: 0 }, uColor1: { value: cfg.c1 }, uColor2: { value: cfg.c2 }, uColor3: { value: cfg.c3 }, uOpacity: { value: cfg.op } },
          transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide
        });
        nebMats.push(mat);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(...(cfg.pos as [number, number, number])); mesh.rotation.z = cfg.rot; mesh.scale.set(...(cfg.sc as [number, number, number]));
        nebGroup.add(mesh);
      });

      // Stars (software rasterizers use the trimmed counts — additive
      // glow quads are fill-rate bound in CPU rasterization).
      const starGroup = new THREE.Group(); scene.add(starGroup);
      const palettes = [new THREE.Color(0xF5EFE4), new THREE.Color(0xE5C878), new THREE.Color(0xC9A25E), new THREE.Color(0xf5b914)];
      const density = isSoftware ? (isMobile ? 0.7 : 0.45) : 1;
      const starLayers = [
        { count: Math.round((isMobile ? 500 : 1200) * density), zRange: [-80, -20], size: [0.6, 1.8], layer: 0 },
        { count: Math.round((isMobile ? 300 : 800) * density), zRange: [-50, -10], size: [1.0, 2.8], layer: 0.5 },
        { count: Math.round((isMobile ? 150 : 400) * density), zRange: [-30, 5], size: [1.5, 4.0], layer: 1 }
      ];
      starMeshes = [];
      starLayers.forEach(layer => {
        const geo = new THREE.BufferGeometry();
        const pos = new Float32Array(layer.count * 3), col = new Float32Array(layer.count * 3), sz = new Float32Array(layer.count), twSpd = new Float32Array(layer.count), twOff = new Float32Array(layer.count), dep = new Float32Array(layer.count);
        for (let i = 0; i < layer.count; i++) {
          pos[i * 3] = (Math.random() - 0.5) * 140; pos[i * 3 + 1] = (Math.random() - 0.5) * 100; pos[i * 3 + 2] = layer.zRange[0] + Math.random() * (layer.zRange[1] - layer.zRange[0]);
          const c = palettes[Math.floor(Math.random() * palettes.length)]; col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
          sz[i] = layer.size[0] + Math.random() * (layer.size[1] - layer.size[0]); twSpd[i] = 0.5 + Math.random() * 3.0; twOff[i] = Math.random() * Math.PI * 2; dep[i] = layer.layer;
        }
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3)); geo.setAttribute('aSize', new THREE.BufferAttribute(sz, 1)); geo.setAttribute('aTwinkleSpeed', new THREE.BufferAttribute(twSpd, 1)); geo.setAttribute('aTwinkleOffset', new THREE.BufferAttribute(twOff, 1)); geo.setAttribute('aDepthLayer', new THREE.BufferAttribute(dep, 1));
        const mat = new THREE.ShaderMaterial({
          vertexShader: STAR_VERTEX, fragmentShader: STAR_FRAGMENT,
          uniforms: { uTime: { value: 0 }, uPixelRatio: { value: dpr }, uMouseX: { value: 0 }, uMouseY: { value: 0 } },
          transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
        });
        starMeshes.push(mat); starGroup.add(new THREE.Points(geo, mat));
      });

      // Dust (software rasterizers use a trimmed count)
      const dustCount = isSoftware ? (isMobile ? 600 : 900) : (isMobile ? 800 : 2000);
      dustGeo = new THREE.BufferGeometry();
      const dPos = new Float32Array(dustCount * 3), dSize = new Float32Array(dustCount), dAlpha = new Float32Array(dustCount), dSpeed = new Float32Array(dustCount);
      for (let i = 0; i < dustCount; i++) {
        dPos[i * 3] = (Math.random() - 0.5) * 70; dPos[i * 3 + 1] = (Math.random() - 0.5) * 50; dPos[i * 3 + 2] = (Math.random() - 0.5) * 25 + 5;
        dSize[i] = 0.3 + Math.random() * 0.8; dAlpha[i] = 0.2 + Math.random() * 0.5; dSpeed[i] = 0.3 + Math.random() * 1.2;
      }
      dustGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3)); dustGeo.setAttribute('aSize', new THREE.BufferAttribute(dSize, 1)); dustGeo.setAttribute('aAlpha', new THREE.BufferAttribute(dAlpha, 1)); dustGeo.setAttribute('aSpeed', new THREE.BufferAttribute(dSpeed, 1));
      dustMat = new THREE.ShaderMaterial({
        vertexShader: DUST_VERTEX, fragmentShader: DUST_FRAGMENT,
        uniforms: { uTime: { value: 0 }, uPixelRatio: { value: dpr } },
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
      });
      starGroup.add(new THREE.Points(dustGeo, dustMat));

      // Rings
      const orbitGroup = new THREE.Group(); orbitGroup.position.set(0, 0, -12); scene.add(orbitGroup);

      const c = document.createElement('canvas'); c.width = 128; c.height = 128; const x = c.getContext('2d')!;
      const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.2, 'rgba(255,240,200,0.8)'); g.addColorStop(0.5, 'rgba(245,185,20,0.3)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g; x.fillRect(0, 0, 128, 128);
      glowTex = new THREE.CanvasTexture(c);

      const createOrbit = (radius: number, colorHex: number, opacity: number, rx: number, ry: number, rz: number) => {
        const grp = new THREE.Group();
        grp.scale.set(0.75, 0.75, 0.75);
        const rGeo = new THREE.RingGeometry(radius, radius + 0.06, 256);
        const rMat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
        grp.add(new THREE.Mesh(rGeo, rMat));
        const gGeo = new THREE.RingGeometry(radius - 0.4, radius + 0.46, 256);
        const gMat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
        grp.add(new THREE.Mesh(gGeo, gMat));
        const ogGeo = new THREE.RingGeometry(radius - 1.2, radius + 1.26, 256);
        const ogMat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
        grp.add(new THREE.Mesh(ogGeo, ogMat));
        const pearlCount = 6; const pGeo = new THREE.BufferGeometry(); const pPos = new Float32Array(pearlCount * 3); const pVel = new Float32Array(pearlCount);
        for (let i = 0; i < pearlCount; i++) {
          const a = (i / pearlCount) * Math.PI * 2; pPos[i * 3] = Math.cos(a) * radius; pPos[i * 3 + 1] = Math.sin(a) * radius; pPos[i * 3 + 2] = 0; pVel[i] = 0.3 + Math.random() * 0.4;
        }
        pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
        const pMat = new THREE.PointsMaterial({ size: 0.7, map: glowTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
        grp.add(new THREE.Points(pGeo, pMat));
        grp.rotation.x = rx; grp.rotation.y = ry; grp.rotation.z = rz;
        return { grp, rMat, gMat, ogMat, pGeo, pMat, pPos, pVel, baseOpacity: opacity };
      };

      rings = [
        createOrbit(18, 0xf5b914, 0.2, Math.PI / 3, Math.PI / 6, 0),
        createOrbit(30, 0xc9a24b, 0.14, -Math.PI / 4, Math.PI / 4, 0),
        createOrbit(24, 0x8B6B3D, 0.1, Math.PI / 5, -Math.PI / 3, 0)
      ];
      rings.forEach((r) => orbitGroup.add(r.grp));

      introProgress = 0;

      const onMouseMove = (e: MouseEvent) => {
        const rect = container.getBoundingClientRect();
        tMX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        tMY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      };
      window.addEventListener('mousemove', onMouseMove);

      const onResize = () => {
        if (camera && renderer) {
          const w = container.clientWidth;
          const h = container.clientHeight;
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      };
      window.addEventListener('resize', onResize);

      // v42: pause rendering entirely while the hero is scrolled out of
      // view — the canvas is absolute-positioned inside the 100dvh hero,
      // so once it leaves the viewport every rendered frame is invisible
      // wasted GPU/CPU work. (Also stops the clock so resuming does not
      // jump the time-based drift.)
      // v45: cancel the rAF itself when hidden (the previous version kept
      // scheduling frames and merely skipped the work — the main thread
      // still woke ~60×/s for the rest of the session; mirrors
      // birthday-visualizer's IntersectionObserver pattern).
      let heroVisible = true;
      let running = true; // animate loop currently scheduled
      const io = new IntersectionObserver(
        (entries) => {
          const visible = entries[0]?.isIntersecting ?? true;
          if (visible) {
            if (!heroVisible) clock.getDelta(); // swallow hidden time
            if (!running) {
              running = true;
              animate();
            }
          } else if (running) {
            // Paused — cancel the in-flight rAF so the main thread can sleep.
            running = false;
            cancelAnimationFrame(animId);
            animId = 0;
          }
          heroVisible = visible;
        },
        { threshold: 0 },
      );
      io.observe(container);

      const easeInOutQuint = (t: number) => t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;

      const animate = () => {
        animId = requestAnimationFrame(animate);
        // v42: software rasterizers render at 30Hz (the twinkling and
        // slow camera drift stay visually lossless at half cadence).
        frameCounter++;
        if (renderInterval > 1 && frameCounter % renderInterval !== 0) return;
        if (!heroVisible) return;
        const dt = Math.min(clock.getDelta(), 0.05);
        const t = clock.getElapsedTime();

        mouseX += (tMX - mouseX) * 0.025;
        mouseY += (tMY - mouseY) * 0.025;

        nebMats.forEach(m => m.uniforms.uTime.value = t);
        starMeshes.forEach(m => { m.uniforms.uTime.value = t; m.uniforms.uMouseX.value = mouseX; m.uniforms.uMouseY.value = mouseY; });
        dustMat.uniforms.uTime.value = t;

        if (introProgress < 1) {
          introProgress += dt / 4.5;
          if (introProgress > 1) introProgress = 1;
          const eased = easeInOutQuint(introProgress);

          camera.fov = 85 - (30 * eased);
          camera.updateProjectionMatrix();

          camera.position.z = 90 - (64 * eased);
          camera.position.y = 5 - (5 * eased);
          camera.position.x = 3 - (3 * eased);

          camera.rotation.x = (1 - eased) * 0.2;
          camera.rotation.y = (1 - eased) * 0.3;
          camera.rotation.z = (1 - eased) * 0.1;

          renderer.toneMappingExposure = 1.8 - (0.68 * eased);
          (scene.fog as THREE.FogExp2).density = 0.014 * eased;

          const ringScale = 0.75 + (0.25 * eased);
          rings.forEach((ring) => {
            ring.grp.scale.set(ringScale, ringScale, 1);
            ring.rMat.opacity = ring.baseOpacity * eased;
            ring.gMat.opacity = (ring.baseOpacity * 0.12) * eased;
            ring.ogMat.opacity = (ring.baseOpacity * 0.04) * eased;
            ring.pMat.opacity = 0.85 * eased;
          });
        } else {

          
          renderer.toneMappingExposure = 1.12;
          camera.fov = 55;
          camera.updateProjectionMatrix();

          const driftX = Math.sin(t * 0.04) * 1.5;
          const driftY = Math.cos(t * 0.03) * 0.8;
          const driftZ = Math.sin(t * 0.015) * 1.0;
          camera.position.x = driftX + mouseX * 2.5;
          camera.position.y = driftY + mouseY * 1.8;
          camera.position.z = 26 + driftZ;
          camera.lookAt(Math.sin(t * 0.02) * 0.5, Math.cos(t * 0.025) * 0.3, 0);
        }

        rings[0].grp.rotation.z = t * 0.012;
        rings[1].grp.rotation.z = -t * 0.009;
        rings[2].grp.rotation.z = t * 0.007;

        rings.forEach((ring) => {
          const pos = ring.pGeo.attributes.position.array as Float32Array;
          for (let i = 0; i < ring.pPos.length / 3; i++) {
            const a = (t * ring.pVel[i] * 0.15) + (i / (ring.pPos.length / 3)) * Math.PI * 2;
            const r = Math.sqrt(ring.pPos[i * 3] * ring.pPos[i * 3] + ring.pPos[i * 3 + 1] * ring.pPos[i * 3 + 1]);
            pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = Math.sin(a) * r;
          }
          ring.pGeo.attributes.position.needsUpdate = true;
        });

        renderer.render(scene, camera);
      };
      animate();

      // Cleanup function
      return () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('resize', onResize);
        io.disconnect();
        cancelAnimationFrame(animId);
        try { container.removeChild(renderer.domElement); } catch (e) {}
        scene.traverse((obj) => {
          const node = obj as unknown as {
            geometry?: THREE.BufferGeometry;
            material?: THREE.Material | THREE.Material[];
          };
          if (node.geometry) node.geometry.dispose();
          if (node.material) {
            // Only textured materials (PointsMaterial etc.) expose `.map`.
            const mat = (Array.isArray(node.material) ? node.material[0] : node.material) as
              THREE.Material & { map?: THREE.Texture | null };
            if (mat.map) mat.map.dispose();
            if (Array.isArray(node.material)) node.material.forEach((m) => m.dispose());
            else node.material.dispose();
          }
        });
        renderer.dispose();
      };
    };

    // v45: contain WebGL construction failure (probe-pass-then-create-fail
    // is a real path: GPU process reset, >16 live contexts, driver
    // blocklist races). A throw inside useEffect would blank the whole
    // home page — instead dispose the partial scene and render nothing
    // (the CSS fallback layers behind the canvas remain visible).
    // Nested closure — TS cannot track cross-function definite assignment.
    const disposePartials = () => {
      if (scene) {
        scene.traverse((obj) => {
          const node = obj as unknown as {
            geometry?: THREE.BufferGeometry;
            material?: THREE.Material | THREE.Material[];
          };
          if (node.geometry) node.geometry.dispose();
          if (Array.isArray(node.material)) node.material.forEach((m) => m.dispose());
          else if (node.material) node.material.dispose();
        });
      }
      if (renderer) {
        renderer.dispose();
        try { container.removeChild(renderer.domElement); } catch (e) {}
      }
    };
    try {
      return initScene();
    } catch (err) {
      console.warn('CosmicBackground: WebGL setup failed — static fallback retained:', err);
      disposePartials();
      return;
    }
  }, []);

  return (
    <>
      <div 
        ref={containerRef} 
        style={styles.container} 
      />
    </>
  );
};

export default CosmicBackground;
