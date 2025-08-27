// ESM imports (like your other project)
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
// (Optional later) import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

const mount = document.getElementById('bg3d');
const width = mount.clientWidth;
const height = mount.clientHeight;

// Scene
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x0d0d0f, 12, 26);

// Camera
const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
camera.position.set(2.8, 1.6, 4.0);
camera.lookAt(1.0, 0.8, 0.0);

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

// Ground
const gMat = new THREE.MeshStandardMaterial({ color: 0x0a0e14, roughness: 1 });
const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), gMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.2;
scene.add(ground);

// Model pivot
const modelGroup = new THREE.Group();
modelGroup.position.set(1.4, 0.9, 0);
scene.add(modelGroup);

// Placeholder low-poly
const placeholderMat = new THREE.MeshStandardMaterial({
  color: 0x7c4dff, metalness: 0.15, roughness: 0.4, flatShading: true
});
const placeholder = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1, 0), placeholderMat);
modelGroup.add(placeholder);

// Loader
const loader = new GLTFLoader();

// Helpers
function disposeObject(root){
  root.traverse((obj) => {
    if (obj.isMesh) {
      obj.geometry?.dispose?.();
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.filter(Boolean).forEach(m => {
        for (const k in m) {
          const v = m[k];
          if (v && v.isTexture) v.dispose?.();
        }
        m.dispose?.();
      });
    }
  });
}
function clearModelGroup(){
  while (modelGroup.children.length) {
    const child = modelGroup.children.pop();
    modelGroup.remove(child);
    disposeObject(child);
  }
}
function fitAndCenter(object3D) {
  // 1) compute size to get a uniform scale
  object3D.updateWorldMatrix(true, false);
  const box1 = new THREE.Box3().setFromObject(object3D);
  const size1 = box1.getSize(new THREE.Vector3());
  const maxDim = Math.max(size1.x, size1.y, size1.z) || 1;
  const target = 1.8; // tweak for your scene
  const scale = target / maxDim;
  object3D.scale.setScalar(scale);

  // 2) after scaling, center pivot in LOCAL space
  object3D.updateWorldMatrix(true, false);
  const box2 = new THREE.Box3().setFromObject(object3D);
  const worldCenter = box2.getCenter(new THREE.Vector3());
  // convert world center to the model's local coords
  const localCenter = object3D.worldToLocal(worldCenter.clone());
  object3D.position.sub(localCenter);

  // optional: ensure no meshes cast/receive shadows unless you want them
  object3D.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
}


let lastObjectURL = null;

function setModelURL(url){
  loader.load(url,
    (gltf) => {
      clearModelGroup();
      const model = gltf.scene || gltf.scenes?.[0];
      fitAndCenter(model);
      modelGroup.add(model);
    },
    undefined,
    (err) => console.error("GLB load error:", err)
  );
}

function loadFromFile(file){
  if (lastObjectURL) URL.revokeObjectURL(lastObjectURL);
  const objURL = URL.createObjectURL(file);
  lastObjectURL = objURL;
  setModelURL(objURL);
}

// Expose a tiny API for the React UI
window.UIScene = { setModelURL, loadFromFile };

// Handle resize
function onResize(){
  const w = mount.clientWidth;
  const h = mount.clientHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', onResize);

// Animate
const clock = new THREE.Clock();
function animate(){
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  modelGroup.rotation.y += (2 * Math.PI / 8) * dt; // ~8s per rotation
  renderer.render(scene, camera);
}
animate();
