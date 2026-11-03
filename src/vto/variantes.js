// Variantes de color del marco (T1.4, spec 03 "Recolorear"). Solo tocan FRAME_*; los cristales no.
// Cada variante del catálogo: { nombre, muestra, original?, frame: { color, roughness, metalness, opacity, procedural } }
//   original: true      → el material tal cual viene en el modelo
//   procedural: "carey" → textura de carey generada acá (ruido), sin archivo ni UVs (proyección triplanar)
import * as THREE from 'three';

const ES_FRAME = /^FRAME_/i;

// Guarda los materiales originales y decide qué piezas se recolorean.
// `info.recolorear`: lista de FRAME_* a tocar. Si no está, todos los FRAME_* opacos (las almohadillas
// de nariz y puntas transparentes quedan como vienen).
export function prepararVariantes(raiz, info = {}) {
  const lista = info.recolorear ? new Set(info.recolorear.map((n) => n.toUpperCase())) : null;
  const piezas = [];
  raiz.traverse((o) => {
    if (!o.isMesh || Array.isArray(o.material) || !ES_FRAME.test(o.material.name)) return;
    const m = o.material;
    const tocar = lista ? lista.has(m.name.toUpperCase()) : !m.transparent;
    if (tocar) piezas.push({ malla: o, original: m });
  });
  raiz.userData.variantes = { piezas, cache: new Map(), actual: null };
}

// Aplica una variante (o la original si es null). Los materiales se crean una vez por variante y se reusan.
export function aplicarVariante(raiz, variante) {
  const datos = raiz.userData.variantes;
  if (!datos) return;
  const clave = variante && !variante.original ? variante.nombre : null;
  if (datos.actual === clave) return;
  datos.actual = clave;
  for (const p of datos.piezas) p.malla.material = clave ? materialDe(datos, p, variante) : p.original;
}

// Mallas "de muestra" con los materiales de cada variante, para preparar los shaders antes de tocar un color.
export function muestrasDeVariantes(raiz, variantes = []) {
  const datos = raiz.userData.variantes;
  if (!datos) return [];
  const out = [];
  for (const v of variantes) {
    if (v.original) continue;
    for (const p of datos.piezas) out.push(new THREE.Mesh(p.malla.geometry, materialDe(datos, p, v)));
  }
  return out;
}

function materialDe(datos, pieza, variante) {
  const k = variante.nombre + '|' + pieza.original.uuid;
  if (!datos.cache.has(k)) datos.cache.set(k, crearMaterial(pieza.original, variante.frame ?? {}));
  return datos.cache.get(k);
}

// Materiales de variantes que no están puestos (para liberarlos junto con el lente).
export function materialesDeVariantes(raiz) {
  const d = raiz.userData.variantes;
  return d ? [...d.cache.values(), ...d.piezas.map((p) => p.original)] : [];
}

function crearMaterial(original, f) {
  const m = original.clone();
  if (f.color || f.procedural) {
    // Color nuevo: se saca la textura de color (si no, el color se mezcla con el dibujo viejo).
    m.map = null;
    m.color.set(f.procedural ? '#ffffff' : f.color);
  }
  if (f.roughness !== undefined) { m.roughness = f.roughness; m.roughnessMap = null; }
  if (f.metalness !== undefined) { m.metalness = f.metalness; m.metalnessMap = null; }
  if (f.opacity !== undefined && f.opacity < 1) {
    m.transparent = true;
    m.opacity = f.opacity;
    m.depthWrite = true; // que tape lo que está detrás del marco (patillas del otro lado)
  }
  if (f.procedural === 'carey') ponerCarey(m);
  m.needsUpdate = true;
  return m;
}

// --- Carey procedural ------------------------------------------------------------------------
// Textura que se repite sin cortes (ruido periódico), con manchas alargadas ámbar sobre marrón oscuro.
let texturaCarey = null;
function obtenerTexturaCarey() {
  if (texturaCarey) return texturaCarey;
  const N = 256;
  const datos = new Uint8Array(N * N * 4);
  const red = 32; // celdas de la grilla de ruido (periódica)
  const azar = new Float32Array(red * red);
  let semilla = 7;
  for (let i = 0; i < azar.length; i++) { semilla = (semilla * 16807) % 2147483647; azar[i] = semilla / 2147483647; }
  const valor = (x, y, per) => {
    const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
    const g = (i, j) => azar[(((j % per) + per) % per) * red + (((i % per) + per) % per)];
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = g(x0, y0) + (g(x0 + 1, y0) - g(x0, y0)) * sx;
    const b = g(x0, y0 + 1) + (g(x0 + 1, y0 + 1) - g(x0, y0 + 1)) * sx;
    return a + (b - a) * sy;
  };
  const fbm = (u, v) => {
    let s = 0, amp = 0.5, per = 4;
    for (let o = 0; o < 4; o++) { s += amp * valor(u * per, v * per, per); amp *= 0.5; per *= 2; }
    return s;
  };
  // Paleta de carey (sRGB): casi negro → marrón → ámbar.
  const paleta = [[22, 10, 5], [58, 26, 10], [118, 58, 18], [176, 104, 40]];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = x / N, v = y / N;
    // Deformar con otro ruido: manchas orgánicas en vez de nubes redondas.
    const w = fbm(u + 0.31, v + 0.77);
    let t = fbm(u + w * 0.35, v * 1 + w * 0.6);
    t = Math.min(Math.max((t - 0.32) / 0.4, 0), 1);
    t = t * t; // más zonas oscuras que claras
    const f = t * (paleta.length - 1), i = Math.min(Math.floor(f), paleta.length - 2), k = f - i;
    const c0 = paleta[i], c1 = paleta[i + 1], p = (y * N + x) * 4;
    datos[p] = c0[0] + (c1[0] - c0[0]) * k;
    datos[p + 1] = c0[1] + (c1[1] - c0[1]) * k;
    datos[p + 2] = c0[2] + (c1[2] - c0[2]) * k;
    datos[p + 3] = 255;
  }
  texturaCarey = new THREE.DataTexture(datos, N, N);
  texturaCarey.colorSpace = THREE.SRGBColorSpace;
  texturaCarey.wrapS = texturaCarey.wrapT = THREE.RepeatWrapping;
  texturaCarey.magFilter = THREE.LinearFilter;
  texturaCarey.minFilter = THREE.LinearMipmapLinearFilter;
  texturaCarey.generateMipmaps = true;
  texturaCarey.needsUpdate = true;
  return texturaCarey;
}

// Triplanar: la textura se proyecta desde los 3 ejes y se mezcla según hacia dónde mira cada cara.
// No necesita UVs (L04 no tiene) y no deja costuras.
function ponerCarey(m) {
  const uniforms = { mapaCarey: { value: obtenerTexturaCarey() }, escalaCarey: { value: 1 / 0.035 } }; // se repite cada 3,5 cm
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vPosCarey;\nvarying vec3 vNorCarey;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPosCarey = position;\nvNorCarey = normal;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vPosCarey;\nvarying vec3 vNorCarey;\nuniform sampler2D mapaCarey;\nuniform float escalaCarey;')
      .replace('#include <map_fragment>', `
        vec3 pesoCarey = pow(abs(normalize(vNorCarey)), vec3(4.0));
        pesoCarey /= (pesoCarey.x + pesoCarey.y + pesoCarey.z + 1e-5);
        vec3 pc = vPosCarey * escalaCarey;
        // Estirado en X: el carey del acetato tiene vetas horizontales.
        vec4 careyX = texture2D(mapaCarey, vec2(pc.z, pc.y * 1.6));
        vec4 careyY = texture2D(mapaCarey, vec2(pc.x * 0.6, pc.z));
        vec4 careyZ = texture2D(mapaCarey, vec2(pc.x * 0.6, pc.y));
        diffuseColor *= careyX * pesoCarey.x + careyY * pesoCarey.y + careyZ * pesoCarey.z;`);
  };
  m.customProgramCacheKey = () => 'carey-foco';
}
