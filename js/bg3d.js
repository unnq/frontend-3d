// bg3d.js — ESM Three.js scene with simple wall-relative camera rail
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Mount
const mount = document.getElementById('bg3d');
const width = mount.clientWidth;
const height = mount.clientHeight;

// Scene
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x0d0d0f, 12, 26);

// ---- Camera (wall-relative, no yaw if X matches) ----
const wallZ       = -8;   // <— set this manually; tweak anytime
const camHeight   = 1.6;  // camera Y
const camDistance = 10;   // distance in front of the wall (z = wallZ + camDistance)
const focusY      = 1.2;  // where on the wall to look
const lookTmp     = new THREE.Vector3();

// Define X positions along the wall for each section (edit to taste)
const railX = {
  start:    0.0,
  model:    2.8,   // default bay for Model Selector
  missions: 8.0,
  worlds:   13.0, 
  settings: 18.0,
};

const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);

function faceWall() {
  lookTmp.set(camera.position.x, focusY, wallZ);
  camera.lookAt(lookTmp); // same X as camera => no yaw
}

// Start at the Model Selector bay
camera.position.set(railX.model, camHeight, wallZ + camDistance);
faceWall();

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(width, height);
renderer.setClearColor(0x0d0d0f, 1);
mount.appendChild(renderer.domElement);

// Lights
const hemi = new THREE.HemisphereLight(0xffffff, 0x0a0e14, 0.65);
const dir  = new THREE.DirectionalLight(0xffffff, 0.9);
dir.position.set(2.5, 4.0, 1.5);
scene.add(hemi, dir);

// Ground (leave as-is; comment out scene.add if you don't want it)
const gMat = new THREE.MeshStandardMaterial({ color: 0x0a0e14, roughness: 1 });
const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), gMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.2;
scene.add(ground);

// --- Environment (your Blender wall) ---
const envLoader = new GLTFLoader();
let environment = null;

envLoader.load(
  'assets/models/walltest.glb',
  (gltf) => {
    environment = gltf.scene || (gltf.scenes && gltf.scenes[0]);
    if (!environment) { console.warn('walltest.glb has no scene'); return; }

    environment.traverse(o => {
      if (o.isMesh && o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach(m => { if (m.side !== THREE.DoubleSide) m.side = THREE.DoubleSide; });
      }
    });

    environment.position.set(0, 0, 0);
    // environment.rotation.y = Math.PI; // flip if needed
    // environment.scale.setScalar(1);
    scene.add(environment);
  },
  undefined,
  (err) => console.error('Env load error:', err)
);

// Model anchor (fixed in world) + inner spin pivot (we rotate this)
const modelGroup = new THREE.Group();
const modelDistance = 4; // how far in front of the wall the model sits
modelGroup.position.set(railX.model, 0.9, wallZ + modelDistance);
scene.add(modelGroup);

const spin = new THREE.Group();
modelGroup.add(spin);

// Placeholder (low-poly) so there's something before first load
const placeholderMat = new THREE.MeshStandardMaterial({
  color: 0x7c4dff, metalness: 0.15, roughness: 0.4, flatShading: true
});
const placeholder = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1, 0), placeholderMat);
spin.add(placeholder);

// Loader
const loader = new GLTFLoader();

// Utils
function disposeObject(root){
  root.traverse((obj) => {
    if (obj.isMesh) {
      obj.geometry && obj.geometry.dispose && obj.geometry.dispose();
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.filter(Boolean).forEach(m => {
        for (const k in m) {
          const v = m[k];
          if (v && v.isTexture && v.dispose) v.dispose();
        }
        m.dispose && m.dispose();
      });
    }
  });
}

function clearSpin(){
  while (spin.children.length) {
    const child = spin.children.pop();
    spin.remove(child);
    disposeObject(child);
  }
}

// Normalize any loaded model to a consistent on-screen size
// and center its local pivot so it rotates in place (not orbit)
function normalizeModel(object3D) {
  if (object3D.parent !== spin) spin.add(object3D);

  object3D.updateWorldMatrix(true, false);
  const box = new THREE.Box3().setFromObject(object3D);
  const sphere = new THREE.Sphere();
  box.getBoundingSphere(sphere);

  if (!isFinite(sphere.radius) || sphere.radius === 0) return;

  const targetRadius = 0.9;
  const scale = targetRadius / sphere.radius;
  object3D.scale.setScalar(scale);

  object3D.updateWorldMatrix(true, false);
  box.setFromObject(object3D).getBoundingSphere(sphere);
  const localCenter = object3D.worldToLocal(sphere.center.clone());
  object3D.position.sub(localCenter);

  object3D.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
}

let lastObjectURL = null;

function setModelURL(url){
  loader.load(
    url,
    (gltf) => {
      clearSpin();
      const model = gltf.scene || (gltf.scenes && gltf.scenes[0]) || null;
      if (!model) { console.warn('GLB has no scene'); return; }
      normalizeModel(model);
    },
    undefined,
    (err) => console.error('GLB load error:', err)
  );
}

function loadFromFile(file){
  if (lastObjectURL) URL.revokeObjectURL(lastObjectURL);
  const objURL = URL.createObjectURL(file);
  lastObjectURL = objURL;
  setModelURL(objURL);
}

// ---- Simple camera tween along the wall (X only) ----
function easeInOutQuad(t){ return t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2)/2; }
let camTween = null; // {from,to,start,dur}

function moveCameraToX(targetX, duration=900){
  camTween = { from: camera.position.x, to: targetX, start: performance.now(), dur: duration };
}

function moveTo(sectionOrX, duration=900){
  const x = (typeof sectionOrX === 'number') ? sectionOrX : railX[sectionOrX];
  if (x == null) return;
  moveCameraToX(x, duration);
}

// Expose API for React UI
window.UIScene = Object.assign(window.UIScene || {}, {
  setModelURL,
  loadFromFile,
  moveTo,
});

// Resize
function onResize(){
  const w = mount.clientWidth;
  const h = mount.clientHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', onResize);

// Animate (rotate inner pivot + apply camera tween)
const clock = new THREE.Clock();
function animate(){
  requestAnimationFrame(animate);
  const dt = clock.getDelta();

  // apply camera tween if active
  if (camTween){
    const t = Math.min(1, (performance.now() - camTween.start) / camTween.dur);
    const e = easeInOutQuad(t);
    camera.position.x = camTween.from + (camTween.to - camTween.from) * e;
    faceWall(); // keep perpendicular to wall
    if (t >= 1) camTween = null;
  }

  spin.rotation.y += (2 * Math.PI / 8) * dt; // ~8s per full turn
  renderer.render(scene, camera);
}
animate();
