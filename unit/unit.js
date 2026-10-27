// CHERKUN™ Creative Compute Unit — 3D-юнит, который едет по листам ленты.
// Читает window.__sheet (дробный номер листа) из основного скрипта страницы.
// Экран показывает лицо (4 выражения), кадр кейса или показания прибора.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const BASE = new URL('.', import.meta.url).href;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function mountUnit(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0.35, 10);

  const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(-3, 5, 6); scene.add(key);
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));

  // материалы
  const metal = new THREE.MeshStandardMaterial({ color: 0xe9ebe7, metalness: 0.55, roughness: 0.3 });
  const metalDark = new THREE.MeshStandardMaterial({ color: 0xb9bcb7, metalness: 0.8, roughness: 0.4 });
  const black = new THREE.MeshStandardMaterial({ color: 0x17161a, metalness: 0.2, roughness: 0.6 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x232227, roughness: 0.85 });
  const amber = new THREE.MeshStandardMaterial({ color: 0xf5a300, emissive: 0xf5a300, emissiveIntensity: 1.6 });

  const unit = new THREE.Group(); scene.add(unit);
  const W = 2.4, H = 1.7, D = 1.8, FZ = D / 2;

  // корпус, ножки, ручки, радиатор
  const body = new THREE.Mesh(new RoundedBoxGeometry(W, H, D, 4, 0.08), metal); unit.add(body);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.22), black);
    foot.position.set(sx * (W / 2 - 0.25), -H / 2 - 0.04, sz * (D / 2 - 0.25)); unit.add(foot);
  }
  for (const sx of [-1, 1]) {
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.1, 12), metalDark);
    handle.position.set(sx * (W / 2 + 0.07), 0, FZ - 0.12); unit.add(handle);
    for (const sy of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.05), metalDark);
      post.position.set(sx * (W / 2 + 0.02), sy * 0.52, FZ - 0.12); unit.add(post);
    }
  }
  for (let i = 0; i < 14; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.22, D * 0.55), metalDark);
    fin.position.set(-0.65 + i * 0.1, H / 2 + 0.11, -0.25); unit.add(fin);
  }
  // кабели сзади
  const cable = (pts, r) => {
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), 48, r, 10), rubber);
    unit.add(m);
  };
  cable([[-0.9, 0.4, -FZ], [-1.3, 0.6, -1.3], [-1.9, -0.2, -1.1], [-2.1, -0.88, -0.4]], 0.05);
  cable([[-0.6, 0.1, -FZ], [-1.0, 0.0, -1.5], [-1.6, -0.7, -1.2], [-2.4, -0.88, -1.0]], 0.04);
  cable([[0.7, 0.5, -FZ], [1.1, 0.9, -1.2], [1.6, 0.2, -1.4], [1.9, -0.88, -1.3]], 0.045);

  // правая колонка: ЭКГ-монитор, шильдик, лампа, тумблеры
  const ecgCanvas = document.createElement('canvas'); ecgCanvas.width = 256; ecgCanvas.height = 180;
  const ecg = ecgCanvas.getContext('2d'); const ecgTex = new THREE.CanvasTexture(ecgCanvas); ecgTex.colorSpace = THREE.SRGBColorSpace;
  const crtBezel = new THREE.Mesh(new RoundedBoxGeometry(0.7, 0.52, 0.08, 2, 0.03), black);
  crtBezel.position.set(0.72, 0.5, FZ + 0.02); unit.add(crtBezel);
  const crt = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.42), new THREE.MeshBasicMaterial({ map: ecgTex, toneMapped: false }));
  crt.position.set(0.72, 0.5, FZ + 0.065); unit.add(crt);

  const label = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.2), new THREE.MeshBasicMaterial({ map: textTexture(512, 146, ctx => {
    ctx.fillStyle = '#111014'; ctx.font = '900 64px "Sofia Sans Extra Condensed", Impact, sans-serif'; ctx.fillText('CHERKUN™', 8, 66);
    ctx.font = '600 25px "Golos Text", sans-serif'; ctx.fillText('CREATIVE COMPUTE UNIT', 10, 112);
  }), transparent: true, toneMapped: false }));
  label.position.set(0.72, 0.05, FZ + 0.005); unit.add(label);

  const led = new THREE.Mesh(new THREE.SphereGeometry(0.055, 20, 12), amber);
  led.position.set(0.47, -0.22, FZ + 0.02); unit.add(led);
  const levers = [];
  for (let i = 0; i < 3; i++) {
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.04), black);
    base.position.set(0.5 + i * 0.22, -0.55, FZ + 0.02); unit.add(base);
    const lever = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.16, 10), metalDark);
    lever.geometry.translate(0, 0.08, 0); lever.position.set(0.5 + i * 0.22, -0.55, FZ + 0.05); lever.rotation.x = 0.7;
    unit.add(lever); levers.push(lever);
  }

  // нутро за дверцей: тёмная ниша, лампы, провода, стикеры-модули
  const inside = new THREE.Group(); unit.add(inside);
  const cavity = new THREE.Mesh(new THREE.PlaneGeometry(1.36, 1.5), new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.9 }));
  cavity.position.set(-0.45, 0, FZ + 0.004); inside.add(cavity);
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xffb340, emissive: 0xff8a00, emissiveIntensity: 2.4, transparent: true, opacity: 0.9 });
  for (let i = 0; i < 4; i++) {
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.22, 16), lampMat);
    lamp.position.set(-0.95 + i * 0.17, 0.08, FZ + 0.07); inside.add(lamp);
  }
  const wireCols = [0xc0392b, 0x2e86de, 0xf5a300, 0x27ae60, 0xdfe1dd];
  for (let i = 0; i < 7; i++) {
    const y0 = 0.7 - i * 0.2, pts = [[-1.1, y0, FZ + 0.01], [-0.6, y0 - 0.15 + Math.sin(i) * 0.1, FZ + 0.05], [0.1, y0 - 0.3, FZ + 0.02]];
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), 24, 0.012, 6),
      new THREE.MeshStandardMaterial({ color: wireCols[i % 5], roughness: 0.6 }));
    inside.add(m);
  }
  const modules = ['Стратегия', 'Концепт', 'Копирайт', 'Сценарий', 'Защита', 'AI-пайплайны'];
  modules.forEach((name, i) => {
    const note = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.3), new THREE.MeshStandardMaterial({ roughness: 0.9, map: textTexture(256, 226, ctx => {
      ctx.fillStyle = '#f7e26b'; ctx.fillRect(0, 0, 256, 226);
      ctx.fillStyle = '#111014'; ctx.font = '600 34px "Golos Text", sans-serif';
      wrap(ctx, name, 18, 70, 220, 40);
    }) }));
    note.position.set(-0.98 + (i % 3) * 0.4, (i < 3 ? 0.5 : -0.42), FZ + 0.11 + i * 0.002);
    note.rotation.z = (i % 2 ? 1 : -1) * (0.06 + i * 0.015);
    inside.add(note);
  });

  // дверца с экраном, петля по левому краю
  const hinge = new THREE.Group(); hinge.position.set(-W / 2 + 0.02, 0, FZ + 0.16); unit.add(hinge);
  const door = new THREE.Mesh(new RoundedBoxGeometry(1.42, 1.56, 0.06, 2, 0.02), metal);
  door.position.set(0.71 + 0.03, 0, 0); hinge.add(door);
  const bezel = new THREE.Mesh(new RoundedBoxGeometry(1.12, 1.24, 0.04, 2, 0.02), black);
  bezel.position.set(0.74, 0, 0.045); hinge.add(bezel);
  const screenMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.12), screenMat);
  screen.position.set(0.74, 0, 0.068); hinge.add(screen);
  const SCREEN_ASPECT = 1.0 / 1.12;

  // мягкая тень-пятно на «полу»
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 3), new THREE.MeshBasicMaterial({ map: textTexture(256, 256, ctx => {
    const g = ctx.createRadialGradient(128, 128, 10, 128, 128, 128); g.addColorStop(0, 'rgba(0,0,0,.28)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
  }), transparent: true, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = -H / 2 - 0.08; unit.add(blob);

  // ---- текстуры экрана
  const loader = new THREE.TextureLoader();
  const cache = new Map();
  function tex(src) {
    if (!cache.has(src)) {
      const t = loader.load(src, () => cover(t));
      t.colorSpace = THREE.SRGBColorSpace; cache.set(src, t);
    }
    return cache.get(src);
  }
  function cover(t) {
    const a = t.image.width / t.image.height;
    if (a > SCREEN_ASPECT) { t.repeat.set(SCREEN_ASPECT / a, 1); t.offset.set((1 - SCREEN_ASPECT / a) / 2, 0); }
    else { t.repeat.set(1, a / SCREEN_ASPECT); t.offset.set(0, (1 - a / SCREEN_ASPECT) / 2); }
  }
  const FACE = ['face_e0.jpg', 'face_e1.jpg', 'face_e2.jpg', 'face_e3.jpg'].map(f => tex(BASE + f));
  const medals = new THREE.CanvasTexture(paintCanvas(512, 574, ctx => {
    ctx.fillStyle = '#111014'; ctx.fillRect(0, 0, 512, 574);
    ctx.fillStyle = '#f5a300'; ctx.font = '900 300px "Sofia Sans Extra Condensed", Impact, sans-serif'; ctx.fillText('15', 40, 330);
    ctx.fillStyle = '#f2f3f1'; ctx.font = '900 120px "Sofia Sans Extra Condensed", Impact, sans-serif'; ctx.fillText('/20', 300, 330);
    ctx.font = '600 34px "Golos Text", sans-serif'; ctx.fillText('медалей — на моих', 44, 430); ctx.fillText('проектах', 44, 474);
  }));
  medals.colorSpace = THREE.SRGBColorSpace;

  // ---- ключевые кадры по листам: доля полуширины, доля полувысоты, масштаб, поворот, дверца, экран
  const K = [
    { x: 0.52, y: 0.2, s: 0.92, ry: -0.42, rx: 0.12, door: 0, show: 'face' },
    { x: 0.5, y: -0.06, s: 1.08, ry: -0.6, rx: 0.08, door: 0, show: 'case' },
    { x: -0.5, y: -0.08, s: 1.12, ry: 0.62, rx: 0.1, door: 1, show: 'focus' },
    { x: 0.62, y: 1.9, s: 0.7, ry: -0.3, rx: 0.1, door: 0, show: 'face' },
    { x: 0.62, y: 1.9, s: 0.7, ry: -0.3, rx: 0.1, door: 0, show: 'face' },
    { x: 0.55, y: -0.05, s: 0.95, ry: -0.35, rx: 0.1, door: 0, show: 'medals' },
    { x: 0.5, y: 0.2, s: 0.85, ry: -0.4, rx: 0.12, door: 0, show: 'smile' },
  ];

  let caseSrc = null, smileUntil = 0, blinkAt = 2.5, mx = 0, my = 0, tvOn = false;
  const blackTex = new THREE.CanvasTexture(paintCanvas(4, 4, ctx => { ctx.fillStyle = '#0d0d10'; ctx.fillRect(0, 0, 4, 4); }));
  addEventListener('pointermove', e => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; });
  addEventListener('unit', e => { if (e.detail.img) caseSrc = e.detail.img; if (e.detail.smile) smileUntil = clock.elapsedTime + 1.4; if ('tv' in e.detail) tvOn = e.detail.tv; });

  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize); resize();

  const clock = new THREE.Clock(); const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => t * t * (3 - 2 * t);
  const cur = { x: 0, y: 0, z: 0, s: 1, ry: 0, rx: 0, door: 0, tv: 0 }; let first = true;
  const corners = [[-0.5, 0.56], [0.5, 0.56], [-0.5, -0.56], [0.5, -0.56]].map(([x, y]) => new THREE.Vector3(x, y, 0));
  const v = new THREE.Vector3();

  renderer.setAnimationLoop(() => {
    if (document.documentElement.classList.contains('lock') && !tvOn) return; // кейс открыт без 3D — юнит спит
    const t = clock.getElapsedTime();
    const f = Math.min(Math.max(window.__sheet || 0, 0), K.length - 1);
    const i = Math.floor(f), j = Math.min(i + 1, K.length - 1), k = ease(f - i), A = K[i], B = K[j];
    const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z, halfW = halfH * camera.aspect;
    const target = {
      x: lerp(A.x, B.x, k) * halfW, y: lerp(A.y, B.y, k) * halfH, s: lerp(A.s, B.s, k) * Math.min(1, camera.aspect / 1.6),
      ry: lerp(A.ry, B.ry, k), rx: lerp(A.rx, B.rx, k), door: lerp(A.door, B.door, k), z: 0, tv: 0,
    };
    if (tvOn) {
      // режим телевизора: экран встаёт ровно перед камерой и занимает ~84% высоты окна
      const d = 1.12 / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 0.84);
      Object.assign(target, { x: 0.44, y: camera.position.y, z: camera.position.z - d - (FZ + 0.228), s: 1, ry: 0, rx: 0, door: 0, tv: 1 });
    }
    const sm = first || reduce ? 1 : 0.12; first = false;
    for (const p in cur) cur[p] = lerp(cur[p], target[p], sm);

    const live = reduce ? 0 : 1 - cur.tv;
    unit.position.set(cur.x, cur.y + Math.sin(t * 1.3) * 0.03 * live, cur.z);
    unit.scale.setScalar(cur.s);
    unit.rotation.set(cur.rx + my * 0.15 * live, cur.ry + mx * 0.5 * live, 0);
    hinge.rotation.y = -cur.door * 1.55;
    inside.visible = cur.door > 0.02;

    // экран
    const show = (k < 0.5 ? A : B).show;
    let map = FACE[0];
    if (t < smileUntil || show === 'smile') map = FACE[1];
    else if (show === 'focus') map = FACE[2];
    else if (show === 'case' && caseSrc) map = tex(caseSrc);
    else if (show === 'medals') map = medals;
    if (tvOn || cur.tv > 0.05) map = blackTex;
    if (map === FACE[0] && !reduce) { if (t > blinkAt) { map = FACE[3]; if (t > blinkAt + 0.14) blinkAt = t + 2.5 + Math.random() * 3; } }
    if (screenMat.map !== map) { screenMat.map = map; screenMat.needsUpdate = true; }

    // ЭКГ, лампа, тумблеры
    drawEcg(ecg, t); ecgTex.needsUpdate = true;
    amber.emissiveIntensity = 1.2 + Math.sin(t * 3) * 0.5;
    levers.forEach((l, n) => l.rotation.x = lerp(l.rotation.x, (Math.floor(f + 0.5) + n) % 2 ? 0.7 : -0.7, 0.1));

    renderer.render(scene, camera);

    // прямоугольник экрана в пикселях окна: по нему страница ставит полотно кейса
    if (cur.tv > 0.01) {
      let l = 1e9, r = -1e9, tp = 1e9, b = -1e9;
      for (const c of corners) {
        v.copy(c); screen.localToWorld(v); v.project(camera);
        const px = (v.x + 1) / 2 * innerWidth, py = (1 - v.y) / 2 * innerHeight;
        l = Math.min(l, px); r = Math.max(r, px); tp = Math.min(tp, py); b = Math.max(b, py);
      }
      window.__screenRect = { l, t: tp, w: r - l, h: b - tp, settled: Math.abs(cur.tv - 1) < 0.01 };
    } else window.__screenRect = null;
  });
}

function paintCanvas(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')); return c; }
function textTexture(w, h, draw) { const t = new THREE.CanvasTexture(paintCanvas(w, h, draw)); t.colorSpace = THREE.SRGBColorSpace; return t; }
function wrap(ctx, text, x, y, max, lh) {
  let line = ''; for (const word of text.split(' ')) { const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > max && line) { ctx.fillText(line, x, y); line = word; y += lh; } else line = test; }
  ctx.fillText(line, x, y);
}
function drawEcg(ctx, t) {
  const w = 256, h = 180; ctx.fillStyle = '#0b1a10'; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#3dff7a'; ctx.lineWidth = 3; ctx.beginPath();
  for (let x = 0; x <= w; x += 2) {
    const ph = ((x / w) * 2 + t * 0.9) % 1; let y = 0;
    if (ph > 0.42 && ph < 0.46) y = -55 * Math.sin((ph - 0.42) / 0.04 * Math.PI);
    else if (ph > 0.46 && ph < 0.5) y = 22 * Math.sin((ph - 0.46) / 0.04 * Math.PI);
    else if (ph > 0.6 && ph < 0.7) y = -10 * Math.sin((ph - 0.6) / 0.1 * Math.PI);
    x ? ctx.lineTo(x, h / 2 + y) : ctx.moveTo(x, h / 2 + y);
  }
  ctx.stroke();
}
