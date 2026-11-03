// Suavizado One Euro (spec 02 §6): quieto = filtra mucho (sin temblor); en movimiento = filtra poco (sin atraso).
// Paper: Casiez et al. 2012, "1€ Filter".
import { Matrix4, Quaternion, Vector3 } from 'three';

const alfa = (cutoff, dt) => {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / dt);
};

class FiltroEscalar {
  constructor(params) { this.params = params; this.reiniciar(); }
  reiniciar() { this.x = null; this.dx = 0; }
  filtrar(x, dt) {
    if (this.x === null) { this.x = x; return x; }
    const { minCutoff, beta, dCutoff } = this.params;
    const dx = (x - this.x) / dt;
    this.dx += alfa(dCutoff, dt) * (dx - this.dx);
    const cutoff = minCutoff + beta * Math.abs(this.dx);
    this.x += alfa(cutoff, dt) * (x - this.x);
    return this.x;
  }
}

// Rotación: misma idea, pero con slerp entre cuaterniones y la velocidad angular en grados/s.
class FiltroRotacion {
  constructor(params) { this.params = params; this.q = new Quaternion(); this.reiniciar(); }
  reiniciar() { this.listo = false; this.vel = 0; }
  filtrar(q, dt) {
    if (!this.listo) { this.q.copy(q); this.listo = true; return this.q; }
    const { minCutoff, beta, dCutoff } = this.params;
    const grados = (this.q.angleTo(q) * 180) / Math.PI;
    this.vel += alfa(dCutoff, dt) * (grados / dt - this.vel);
    const cutoff = minCutoff + beta * Math.abs(this.vel);
    this.q.slerp(q, alfa(cutoff, dt));
    return this.q;
  }
}

// Filtra una matriz 4x4 de la cara: posición (3), escala (1) y rotación.
export class FiltroPose {
  constructor(params) {
    this.params = params;
    this.pos = [0, 1, 2].map(() => new FiltroEscalar(params));
    this.esc = new FiltroEscalar(params);
    this.rot = new FiltroRotacion(params);
    this.tPrevio = null;
    this._p = new Vector3(); this._q = new Quaternion(); this._s = new Vector3();
  }

  reiniciar() {
    this.pos.forEach((f) => f.reiniciar());
    this.esc.reiniciar();
    this.rot.reiniciar();
    this.tPrevio = null;
  }

  // entrada/salida: Matrix4. t en segundos.
  filtrar(matriz, t, salida = new Matrix4()) {
    if (!this.params.activo) return salida.copy(matriz);
    const dt = this.tPrevio === null ? 1 / 30 : Math.max(1e-3, t - this.tPrevio);
    this.tPrevio = t;

    matriz.decompose(this._p, this._q, this._s);
    const p = this._p;
    p.set(this.pos[0].filtrar(p.x, dt), this.pos[1].filtrar(p.y, dt), this.pos[2].filtrar(p.z, dt));
    // MediaPipe usa escala uniforme: filtramos el promedio.
    const s = this.esc.filtrar((this._s.x + this._s.y + this._s.z) / 3, dt);
    this._s.set(s, s, s);
    const q = this.rot.filtrar(this._q, dt);
    return salida.compose(p, q, this._s);
  }
}
