// Escena Three.js que calza con la cámara de MediaPipe (spec 02 §3, §4, §7).
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { AJUSTE_PUENTE, CAMARA, ESCALA_LENTE, OCLUSOR, PATILLAS, PUENTE_BASE, RUTAS } from './constantes.js';
import { abrirPatillas, prepararPatillas } from './patillas.js';
import { prepararCristales } from './cristales.js';
import { aplicarVariante, materialesDeVariantes, muestrasDeVariantes, prepararVariantes } from './variantes.js';

export function crearEscena(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const escena = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  escena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  const luz = new THREE.DirectionalLight(0xffffff, 1.2);
  luz.position.set(0.3, 1, 1);
  escena.add(luz);

  // Cámara en el origen mirando a -Z, como la de MediaPipe.
  const camara = new THREE.PerspectiveCamera(CAMARA.fov, 16 / 9, CAMARA.near, CAMARA.far);

  // Grupo "cabeza": recibe la matriz de la cara tal cual (ya incluye la escala de cada persona).
  const cabeza = new THREE.Group();
  cabeza.matrixAutoUpdate = false;
  escena.add(cabeza);

  // Punto donde se cuelga el lente: puente de la nariz + ajuste fino.
  const anclaLente = new THREE.Group();
  cabeza.add(anclaLente);
  const ajuste = { ...AJUSTE_PUENTE };
  const aplicarAjuste = () =>
    anclaLente.position.set(PUENTE_BASE.x + ajuste.x, PUENTE_BASE.y + ajuste.y, PUENTE_BASE.z + ajuste.z);
  aplicarAjuste();

  // Forma del oclusor y apertura de patillas (T1.0). Se ajustan con los sliders de debug.
  const forma = { oclusorAncho: OCLUSOR.escala.x, oclusorZ: OCLUSOR.corrimientoZ, aperturaPatillas: PATILLAS.aperturaGrados,
    separacionPatillas: PATILLAS.separacionMm };
  const aplicarOclusor = () => {
    if (!oclusor) return;
    oclusor.scale.set(forma.oclusorAncho, OCLUSOR.escala.y, OCLUSOR.escala.z);
    oclusor.position.set(0, 0, forma.oclusorZ);
  };
  const aplicarPatillas = () => { if (lente) abrirPatillas(lente, forma.aperturaPatillas, forma.separacionPatillas); };

  const matOculto = new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide });
  const matVisible = new THREE.MeshBasicMaterial({ color: 0xe0301e, wireframe: true, transparent: true, opacity: 0.6 });
  let oclusor = null;
  let lente = null;
  const cargador = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);

  return {
    renderer,
    camara,
    cabeza,
    ajuste,
    aplicarAjuste,
    forma,
    aplicarOclusor,
    aplicarPatillas,

    async cargarOclusor() {
      oclusor = await new OBJLoader().loadAsync(RUTAS.oclusor);
      aplicarOclusor();
      oclusor.traverse((o) => {
        if (o.isMesh) { o.material = matOculto; o.renderOrder = -1; }
      });
      oclusor.renderOrder = -1;
      cabeza.add(oclusor);
    },

    // Descarga y prepara un lente, sin ponerlo en la cara (sirve para precargar el anterior y el siguiente).
    // `info` = su entrada del catálogo (tipo, cristal, variantes, recolorear).
    async cargarModelo(url, info = {}) {
      const gltf = await cargador.loadAsync(url);
      const nuevo = gltf.scene;
      prepararPatillas(nuevo);
      nuevo.scale.setScalar(ESCALA_LENTE);
      nuevo.traverse((o) => {
        if (!o.isMesh) return;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) {
          // `transmission` es muy cara en el celu: cristal transparente común (spec 02 §7).
          if (m.transmission > 0) {
            m.transmission = 0;
            m.transparent = true;
            m.opacity = Math.min(m.opacity ?? 1, 0.3);
          }
        }
      });
      prepararCristales(nuevo, info);
      prepararVariantes(nuevo, info);
      nuevo.userData.info = info;
      return nuevo;
    },

    // Prepara los shaders de un lente todavía no puesto, para que al elegirlo aparezca sin trabarse.
    // También los colores del lente, así cambiar de color tampoco traba.
    async precompilarModelo(modelo) {
      const muestras = new THREE.Group();
      for (const m of muestrasDeVariantes(modelo, modelo.userData.info?.variantes)) muestras.add(m);
      muestras.scale.setScalar(ESCALA_LENTE);
      await renderer.compileAsync(modelo, camara, escena);
      if (muestras.children.length) await renderer.compileAsync(muestras, camara, escena);
    },

    // Pone en la cara un lente ya cargado. El anterior no se libera acá: lo maneja la caché del motor.
    ponerLente(modelo, variante = null) {
      aplicarVariante(modelo, variante);
      if (lente === modelo) return;
      if (lente) anclaLente.remove(lente);
      lente = modelo;
      abrirPatillas(lente, forma.aperturaPatillas, forma.separacionPatillas);
      anclaLente.add(lente);
    },

    liberarModelo(modelo) {
      if (modelo === lente) return; // nunca el que está puesto
      liberar(modelo);
      for (const m of materialesDeVariantes(modelo)) m.dispose();
    },

    // Cambia el color del lente puesto (T1.4).
    ponerVariante(variante) { if (lente) aplicarVariante(lente, variante); },

    // Encuadre: el video se muestra con object-fit: cover, así que recortamos la vista 3D igual.
    encuadrar(enc) {
      camara.aspect = enc.videoAncho / enc.videoAlto;
      camara.setViewOffset(enc.anchoTotal, enc.altoTotal, enc.offsetX, enc.offsetY, enc.ancho, enc.alto);
      camara.updateProjectionMatrix();
      renderer.setSize(enc.ancho, enc.alto, false);
    },

    ponerMatriz(m) {
      cabeza.matrix.copy(m);
      cabeza.matrixWorldNeedsUpdate = true;
    },

    set oclusorVisible(v) {
      oclusor?.traverse((o) => { if (o.isMesh) o.material = v ? matVisible : matOculto; });
    },
    set lenteVisible(v) { anclaLente.visible = v; },

    // Prepara los shaders durante la carga, para que el primer cuadro con el lente no se trabe.
    async precompilar() {
      await renderer.compileAsync(escena, camara);
    },

    render() { renderer.render(escena, camara); },

    liberar() {
      if (lente) for (const m of materialesDeVariantes(lente)) m.dispose();
      liberar(escena);
      escena.environment?.dispose();
      matOculto.dispose();
      matVisible.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      // Un canvas con el contexto perdido no se puede reusar: lo cambiamos por uno nuevo para la próxima apertura.
      canvas.replaceWith(canvas.cloneNode(false));
    },
  };
}

function liberar(obj) {
  obj.traverse((o) => {
    if (!o.isMesh) return;
    o.geometry?.dispose();
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      for (const v of Object.values(m)) if (v?.isTexture) v.dispose();
      m.dispose();
    }
  });
}
