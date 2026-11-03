// Cristales livianos para el celu (T1.3, spec 02 §7). Sin `transmission` (muy cara).
// Receta: casi transparentes, con un reflejo suave del ambiente que se suma encima (no tapa los ojos).
// Sol: tinte oscuro con degradé, más oscuro arriba.
import * as THREE from 'three';
import { CRISTAL } from './constantes.js';

// Uniforms compartidos por todos los cristales: así los sliders de debug cambian todo en vivo.
export const ajusteCristal = {
  alfaReceta: { value: CRISTAL.alfaReceta },
  reflejo: { value: CRISTAL.reflejo },
  topeBrillo: { value: CRISTAL.topeBrillo },
};

const ES_CRISTAL = /^LENS_/i;
const ANCHO_MIN_CRISTAL = 0.03; // m. Piezas LENS_* más chicas son almohadillas de nariz, no cristales.

// Reemplaza los materiales LENS_* del lente. Si no tiene cristales (L02), intenta agregarlos con la forma del aro.
// `raiz` ya pasó por prepararPatillas (geometría en metros, espacio del lente). `info` = entrada del catálogo.
export function prepararCristales(raiz, info = {}) {
  const sol = info.tipo === 'sol';
  const tinte = info.cristal?.tinte ?? (sol ? CRISTAL.tinteSol : CRISTAL.colorReceta);

  let cristales = [];
  const chicos = [];
  raiz.traverse((o) => {
    if (!o.isMesh || Array.isArray(o.material) || !ES_CRISTAL.test(o.material.name)) return;
    o.geometry.computeBoundingBox();
    const b = o.geometry.boundingBox;
    (b.max.x - b.min.x > ANCHO_MIN_CRISTAL ? cristales : chicos).push(o);
  });

  if (!cristales.length && info.cristal?.agregar !== false) cristales = agregarCristalesDelAro(raiz);
  if (!cristales.length && !chicos.length) return;

  // Alto de los cristales, para el degradé.
  let yMin = Infinity, yMax = -Infinity;
  for (const c of cristales) { yMin = Math.min(yMin, c.geometry.boundingBox.min.y); yMax = Math.max(yMax, c.geometry.boundingBox.max.y); }

  const principal = crearMaterialCristal({
    nombre: 'LENS_0', color: tinte,
    alfaArriba: sol ? CRISTAL.solArriba : null, alfaAbajo: sol ? CRISTAL.solAbajo : null,
    rangoY: [yMin, yMax],
  });
  const almohadilla = crearMaterialCristal({ nombre: 'LENS_almohadilla', color: CRISTAL.colorReceta, alfaArriba: 0.3, alfaAbajo: 0.3 });

  for (const c of cristales) { liberarMaterial(c.material); c.material = principal; c.renderOrder = 2; }
  for (const c of chicos) { liberarMaterial(c.material); c.material = almohadilla; c.renderOrder = 2; }
}

// Material de cristal: MeshStandardMaterial con dos retoques en el shader:
// 1) opacidad con degradé vertical (sol) o fija (receta, la del slider);
// 2) el reflejo del ambiente se suma encima con alfa premultiplicado, así se ve aunque el cristal sea casi invisible.
function crearMaterialCristal({ nombre, color, alfaArriba = null, alfaAbajo = null, rangoY = [-0.03, 0.03] }) {
  const m = new THREE.MeshStandardMaterial({
    name: nombre, color, roughness: 0.15, metalness: 0, // un poco rugoso: brillo suave, no la imagen nítida de una lámpara
    transparent: true, depthWrite: false, premultipliedAlpha: true, side: THREE.FrontSide,
  });
  const fija = alfaArriba === null;
  const uniforms = {
    rangoY: { value: new THREE.Vector2(rangoY[0], rangoY[1]) },
    alfaArriba: fija ? ajusteCristal.alfaReceta : { value: alfaArriba },
    alfaAbajo: fija ? ajusteCristal.alfaReceta : { value: alfaAbajo },
    fuerzaReflejo: ajusteCristal.reflejo,
    topeBrillo: ajusteCristal.topeBrillo,
  };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vYLente;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvYLente = position.y;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying float vYLente;
        uniform vec2 rangoY;
        uniform float alfaArriba, alfaAbajo, fuerzaReflejo, topeBrillo;`)
      .replace('#include <opaque_fragment>', `
        float tY = clamp((vYLente - rangoY.x) / max(rangoY.y - rangoY.x, 1e-5), 0.0, 1.0);
        float borde = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 3.0);
        diffuseColor.a = clamp(mix(alfaAbajo, alfaArriba, smoothstep(0.0, 1.0, tY)) + borde * 0.06, 0.0, 1.0);
        // El brillo de la luz directa se baja: en cristales curvos (L04) hace una mancha blanca grande.
        vec3 reflejoCristal = (reflectedLight.directSpecular * 0.3 + reflectedLight.indirectSpecular) * fuerzaReflejo;
        outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
        #include <opaque_fragment>`)
      .replace('#include <premultiplied_alpha_fragment>', `#include <premultiplied_alpha_fragment>
        vec3 brilloCristal = reflejoCristal;
        #ifdef TONE_MAPPING
          brilloCristal = toneMapping(brilloCristal);
        #endif
        // Tope al brillo final (ya en colores de pantalla): como mucho aclara un poco, nunca una mancha blanca sobre el ojo.
        brilloCristal = min(linearToOutputTexel(vec4(brilloCristal, 1.0)).rgb, vec3(topeBrillo));
        gl_FragColor.rgb += brilloCristal * (1.0 - gl_FragColor.a);`);
  };
  m.customProgramCacheKey = () => 'cristal-foco';
  return m;
}

function liberarMaterial(m) {
  for (const v of Object.values(m)) if (v?.isTexture) v.dispose();
  m.dispose();
}

// ---------------------------------------------------------------------------------------------
// Cristal agregado para lentes que no lo traen (L02): se busca el hueco del aro mirando el frente
// de frente, y se lo rellena con un plano. Si el hueco no está cerrado (ej. medio aro), no se agrega.
const CELDA = 0.0004; // m (0,4 mm)
const RAYOS = 160;

function agregarCristalesDelAro(raiz) {
  const tris = trianguloDelFrente(raiz);
  if (!tris.length) return [];
  let mitad = 0, yMin = Infinity, yMax = -Infinity;
  for (const t of tris) for (let k = 0; k < 9; k += 3) {
    mitad = Math.max(mitad, Math.abs(t[k])); yMin = Math.min(yMin, t[k + 1]); yMax = Math.max(yMax, t[k + 1]);
  }
  const nuevos = [];
  for (const lado of [1, -1]) {
    const contorno = buscarHueco(tris, lado, mitad, yMin, yMax);
    if (!contorno) continue;
    const forma = new THREE.Shape(contorno.puntos.map(([x, y]) => new THREE.Vector2(x * lado, y)));
    const g = new THREE.ShapeGeometry(forma, 1);
    g.translate(0, 0, contorno.z);
    g.computeBoundingBox();
    const malla = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ name: 'LENS_agregado' }));
    malla.name = 'cristal_agregado';
    raiz.add(malla);
    nuevos.push(malla);
  }
  return nuevos;
}

// Triángulos del frente (z cerca de 0): patillas afuera. Cada uno: [x0,y0,z0, x1,y1,z1, x2,y2,z2].
function trianguloDelFrente(raiz) {
  const out = [];
  raiz.traverse((o) => {
    if (!o.isMesh || ES_CRISTAL.test(o.material?.name ?? '')) return;
    const pos = o.geometry.getAttribute('position');
    const idx = o.geometry.index;
    const n = idx ? idx.count : pos.count;
    for (let i = 0; i < n; i += 3) {
      const t = [];
      let delante = true;
      for (let k = 0; k < 3; k++) {
        const v = idx ? idx.getX(i + k) : i + k;
        const z = pos.getZ(v);
        if (z < -0.014) { delante = false; break; }
        t.push(pos.getX(v), pos.getY(v), z);
      }
      if (delante) out.push(t);
    }
  });
  return out;
}

function buscarHueco(tris, lado, mitad, yMin, yMax) {
  const ancho = Math.ceil(mitad / CELDA) + 2, alto = Math.ceil((yMax - yMin) / CELDA) + 2;
  const ocupado = new Uint8Array(ancho * alto);
  const zSuma = new Float32Array(ancho * alto);
  const celda = (x, y) => [Math.floor((x * lado) / CELDA), Math.floor((y - yMin) / CELDA)];
  const marcar = (cx, cy, z) => {
    if (cx < 0 || cy < 0 || cx >= ancho || cy >= alto) return;
    const i = cy * ancho + cx;
    if (!ocupado[i]) zSuma[i] = z;
    ocupado[i] = 1;
  };
  // Pintar cada triángulo (del lado que toca) en la grilla: interior + bordes, para no dejar huecos.
  for (const t of tris) {
    if ((t[0] + t[3] + t[6]) * lado < 0) continue;
    const z = (t[2] + t[5] + t[8]) / 3;
    const p = [celda(t[0], t[1]), celda(t[3], t[4]), celda(t[6], t[7])];
    const x0 = Math.min(p[0][0], p[1][0], p[2][0]), x1 = Math.max(p[0][0], p[1][0], p[2][0]);
    const y0 = Math.min(p[0][1], p[1][1], p[2][1]), y1 = Math.max(p[0][1], p[1][1], p[2][1]);
    if ((x1 - x0) * (y1 - y0) > 4000) continue; // triángulo gigante raro: ignorar
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
      if (dentro(cx + 0.5, cy + 0.5, p)) marcar(cx, cy, z);
    }
    for (let e = 0; e < 3; e++) {
      const a = p[e], b = p[(e + 1) % 3];
      const pasos = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), 1) * 2;
      for (let s = 0; s <= pasos; s++) marcar(Math.round(a[0] + ((b[0] - a[0]) * s) / pasos), Math.round(a[1] + ((b[1] - a[1]) * s) / pasos), z);
    }
  }
  const libre = (cx, cy) => cx >= 0 && cy >= 0 && cx < ancho && cy < alto && !ocupado[cy * ancho + cx];

  // Rayos desde el centro del hueco hasta chocar con el aro. Dos pasadas para centrar mejor.
  let cx = ancho * 0.5, cy = alto * 0.5;
  if (!libre(Math.floor(cx), Math.floor(cy))) return null;
  let puntos = null, zs = 0, nz = 0;
  for (let pasada = 0; pasada < 2; pasada++) {
    puntos = []; zs = 0; nz = 0;
    for (let r = 0; r < RAYOS; r++) {
      const ang = (r / RAYOS) * Math.PI * 2;
      const dx = Math.cos(ang) * 0.5, dy = Math.sin(ang) * 0.5;
      let x = cx, y = cy, choco = false;
      for (let paso = 0; paso < 4 * (ancho + alto); paso++) {
        x += dx; y += dy;
        const ix = Math.floor(x), iy = Math.floor(y);
        if (ix < 0 || iy < 0 || ix >= ancho || iy >= alto) break;
        if (ocupado[iy * ancho + ix]) { choco = true; zs += zSuma[iy * ancho + ix]; nz++; break; }
      }
      if (!choco) return null; // aro abierto: no hay hueco cerrado
      // 0,6 mm más afuera, para que quede metido debajo del aro.
      const largo = Math.hypot(x - cx, y - cy) + 0.0006 / CELDA;
      puntos.push([cx + Math.cos(ang) * largo, cy + Math.sin(ang) * largo]);
    }
    cx = puntos.reduce((s, p) => s + p[0], 0) / RAYOS;
    cy = puntos.reduce((s, p) => s + p[1], 0) / RAYOS;
    if (!libre(Math.floor(cx), Math.floor(cy))) break;
  }
  const hueco = puntos.map(([x, y]) => [x * CELDA, y * CELDA + yMin]);
  // Hueco demasiado chico o enorme = no es un cristal.
  const xs = hueco.map((p) => p[0]), ys = hueco.map((p) => p[1]);
  const w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys);
  if (w < 0.025 || w > 0.075 || h < 0.015 || h > 0.07) return null;
  return { puntos: hueco, z: zs / Math.max(nz, 1) };
}

function dentro(x, y, [a, b, c]) {
  const s = (p, q) => (x - q[0]) * (p[1] - q[1]) - (p[0] - q[0]) * (y - q[1]);
  const d1 = s(a, b), d2 = s(b, c), d3 = s(c, a);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
}
