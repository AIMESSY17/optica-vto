// Escena Three.js que calza con la cámara de MediaPipe (spec 02 §3, §4, §7).
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { AJUSTE_PUENTE, CAMARA, ESCALA_LENTE, OCLUSOR, PATILLAS, PUENTE_BASE, RUTAS } from './constantes.js';
import { abrirPatillas, prepararPatillas } from './patillas.js';

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

    async cargarLente(url) {
      const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
      const gltf = await loader.loadAsync(url);
      const nuevo = gltf.scene;
      prepararPatillas(nuevo);
      abrirPatillas(nuevo, forma.aperturaPatillas, forma.separacionPatillas);
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
          if (/^LENS_/i.test(m.name)) m.depthWrite = false;
        }
      });
      if (lente) { anclaLente.remove(lente); liberar(lente); }
      lente = nuevo;
      anclaLente.add(lente);
      return lente;
    },

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
