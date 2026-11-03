// Abre las patillas del lente unos grados hacia afuera, girándolas desde la bisagra (T1.0).
// Sin esto, de perfil la patilla del lado cercano queda dentro de la cara invisible y desaparece.
//
// Los 8 lentes vienen armados distinto (patillas sueltas, las dos juntas en una pieza, o todo el armazón
// en una sola malla), así que no giramos piezas: giramos los vértices que están detrás de la bisagra.
// Se hace una vez al cargar el lente (y de nuevo si se mueve el slider de debug). No cuesta nada por cuadro.
import * as THREE from 'three';
import { PATILLAS } from './constantes.js';

// Prepara el lente: pasa cada malla a coordenadas del lente (metros) y guarda la forma original.
// `raiz` es gltf.scene, todavía sin la escala ×100.
export function prepararPatillas(raiz) {
  raiz.updateMatrixWorld(true);
  const inversa = new THREE.Matrix4().copy(raiz.matrixWorld).invert();
  const mallas = [];
  let mitadAncho = 0;

  raiz.traverse((o) => { if (o.isMesh) mallas.push(o); });
  const vistas = new Set();
  for (const malla of mallas) {
    // Si dos mallas comparten geometría, cada una necesita su copia (se hornea una transformación distinta).
    if (vistas.has(malla.geometry)) malla.geometry = malla.geometry.clone();
    vistas.add(malla.geometry);
    const g = malla.geometry;
    // Los GLB vienen comprimidos (posiciones en enteros + escala en el nodo): los pasamos a números comunes.
    for (const nombre of ['position', 'normal', 'tangent']) {
      const a = g.getAttribute(nombre);
      if (a) g.setAttribute(nombre, aFloat(a));
    }
    // Hornear la transformación del nodo, así todas las mallas comparten el mismo espacio del lente.
    const rel = new THREE.Matrix4().multiplyMatrices(inversa, malla.matrixWorld);
    g.applyMatrix4(rel);
    raiz.attach(malla);
    malla.position.set(0, 0, 0);
    malla.quaternion.identity();
    malla.scale.set(1, 1, 1);
    malla.updateMatrix();

    const pos = g.getAttribute('position');
    for (let i = 0; i < pos.count; i++) mitadAncho = Math.max(mitadAncho, Math.abs(pos.getX(i)));
  }

  for (const malla of mallas) {
    const g = malla.geometry;
    malla.userData.formaOriginal = {
      position: g.getAttribute('position').array.slice(),
      normal: g.getAttribute('normal')?.array.slice(),
      tangent: g.getAttribute('tangent')?.array.slice(),
    };
  }
  raiz.userData.patillas = { mallas, mitadAncho };
}

// Gira las patillas `grados` hacia afuera desde la bisagra y las corre `separacionMm` hacia afuera en X
// (0 y 0 = como viene el modelo). Se puede llamar las veces que haga falta.
export function abrirPatillas(raiz, grados, separacionMm = 0) {
  const datos = raiz.userData.patillas;
  if (!datos) return;
  const { mallas, mitadAncho } = datos;
  const maxRad = THREE.MathUtils.degToRad(grados);
  const sep = separacionMm / 1000; // el GLB está en metros
  const zBisagra = PATILLAS.bisagraZ;
  const xMin = mitadAncho * PATILLAS.xMinRelativo; // nariz, puente y centro del frente no se tocan

  for (const malla of mallas) {
    const g = malla.geometry;
    const orig = malla.userData.formaOriginal;
    const pos = g.getAttribute('position');
    const nor = g.getAttribute('normal');
    const tan = g.getAttribute('tangent');
    const p = pos.array, n = nor?.array, t = tan?.array;
    const op = orig.position, on = orig.normal, ot = orig.tangent;
    const ts = tan?.itemSize ?? 4;

    for (let i = 0; i < pos.count; i++) {
      const x = op[i * 3], y = op[i * 3 + 1], z = op[i * 3 + 2];
      // Cuánto se mueve este vértice: nada en la bisagra, todo un poco más atrás (curva suave, sin quiebre).
      let k = 0;
      if ((maxRad !== 0 || sep !== 0) && Math.abs(x) > xMin && z < zBisagra) {
        k = Math.min((zBisagra - z) / PATILLAS.transicion, 1);
        k = k * k * (3 - 2 * k);
      }
      if (k === 0) {
        p[i * 3] = x; p[i * 3 + 1] = y; p[i * 3 + 2] = z;
        if (n) { n[i * 3] = on[i * 3]; n[i * 3 + 1] = on[i * 3 + 1]; n[i * 3 + 2] = on[i * 3 + 2]; }
        if (t) { t[i * ts] = ot[i * ts]; t[i * ts + 1] = ot[i * ts + 1]; t[i * ts + 2] = ot[i * ts + 2]; }
        continue;
      }
      // Giro alrededor del eje vertical que pasa por la bisagra de ese lado. Derecha (+X) se abre a +X, izquierda a -X.
      const s = x > 0 ? 1 : -1;
      const a = maxRad * k;
      const c = Math.cos(a), sn = Math.sin(a) * s;
      const px = s * mitadAncho;
      const dx = x - px, dz = z - zBisagra;
      p[i * 3] = px + dx * c - dz * sn + s * sep * k;
      p[i * 3 + 1] = y;
      p[i * 3 + 2] = zBisagra + dz * c + dx * sn;
      if (n) {
        const nx = on[i * 3], nz = on[i * 3 + 2];
        n[i * 3] = nx * c - nz * sn; n[i * 3 + 1] = on[i * 3 + 1]; n[i * 3 + 2] = nz * c + nx * sn;
      }
      if (t) {
        const tx = ot[i * ts], tz = ot[i * ts + 2];
        t[i * ts] = tx * c - tz * sn; t[i * ts + 1] = ot[i * ts + 1]; t[i * ts + 2] = tz * c + tx * sn;
      }
    }
    pos.needsUpdate = true;
    if (nor) nor.needsUpdate = true;
    if (tan) tan.needsUpdate = true;
    g.computeBoundingBox();
    g.computeBoundingSphere();
  }
}

// Copia un atributo (posiblemente comprimido en enteros) a Float32, leyendo los valores ya descomprimidos.
function aFloat(a) {
  const n = a.itemSize;
  const out = new Float32Array(a.count * n);
  const leer = [a.getX, a.getY, a.getZ, a.getW];
  for (let i = 0; i < a.count; i++) for (let k = 0; k < n; k++) out[i * n + k] = leer[k].call(a, i);
  return new THREE.BufferAttribute(out, n);
}
