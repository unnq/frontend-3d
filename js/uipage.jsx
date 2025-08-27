const { useState } = React;

/* =========================
   Side Menu (text-only UI)
   ========================= */
function SideMenu({ active, onSelect, onToggleModelMenu, showModelMenu, onPickModel, onUploadClick }) {
  const items = [
    { key: "start",    label: "Start" },
    { key: "missions", label: "Missions" },
    { key: "worlds",   label: "Worlds" },
    { key: "model",    label: "Model Selector" }, // replaced "Arsenal"
    { key: "settings", label: "Settings" },
    { key: "exit",     label: "Exit" },
  ];

  // Placeholder models — update these filenames to your real files
  const MODEL_OPTIONS = [
    { key: "modelA", label: "Model A", url: "assets/models/bmw_m3_gtr_-_psx_style_mw_2012_java.glb" },
    { key: "modelB", label: "Model B", url: "assets/models/macbook_psx_style.glb" },
    { key: "modelC", label: "Model C", url: "assets/models/sonyradio.glb" },
  ];

  return (
    <nav className="side-menu" aria-label="Main menu">
      <div className="menu-title">demosite ui</div>

      <ul className="menu-list">
        {items.map(it => (
          <li key={it.key} style={{ position: "relative" }}>
            <button
              className={`menu-item ${active === it.key ? "is-active" : ""}`}
              onClick={() => {
                if (it.key === "model") onToggleModelMenu();
                else onSelect(it.key);
              }}
            >
              {it.label}
            </button>

            {/* Seamless submenu for "Model Selector" */}
            {it.key === "model" && showModelMenu && (
              <ul className="menu-sub">
                {MODEL_OPTIONS.map(opt => (
                  <li key={opt.key}>
                    <button
                      className="menu-item-sub"
                      onClick={() => onPickModel(opt.url)}
                      title={opt.url}
                    >
                      {opt.label}
                    </button>
                  </li>
                ))}
                <li>
                  <button className="menu-item-sub" onClick={onUploadClick}>
                    Upload .glb / .gltf…
                  </button>
                </li>
              </ul>
            )}
          </li>
        ))}
      </ul>

      <div className="menu-hint">Select a model or upload your own.</div>
    </nav>
  );
}

/* =========================
   HUD wrapper
   ========================= */
function HUD() {
  const [active, setActive] = useState("start");
  const [showModelMenu, setShowModelMenu] = useState(false);

  // Hidden file input for uploads
  let fileInputEl = null;
  const setFileRef = (el) => (fileInputEl = el);

  const onUploadClick = () => fileInputEl?.click();

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/\.gl(b|tf)$/i.test(file.name)) {
      alert("Please choose a .glb or .gltf file");
      e.target.value = "";
      return;
    }
    // Hand off to the Three scene loader
    window.UIScene?.loadFromFile(file);
    // reset input so the same file can be selected again later if needed
    e.target.value = "";
    setShowModelMenu(false);
  };

  const pickModel = (url) => {
    window.UIScene?.setModelURL(url);
    setShowModelMenu(false);
  };

  return (
    <div className="hud">
      <SideMenu
        active={active}
        onSelect={(k) => {
          setActive(k);
          setShowModelMenu(false);
        }}
        onToggleModelMenu={() => {
          setActive("model");
          setShowModelMenu((v) => !v);
        }}
        showModelMenu={showModelMenu}
        onPickModel={pickModel}
        onUploadClick={onUploadClick}
      />

      {/* right side placeholder (kept empty/transparent) */}
      <div className="hud-right" />

      {/* hidden file input */}
      <input
        ref={setFileRef}
        type="file"
        accept=".glb,.gltf"
        style={{ display: "none" }}
        onChange={onFileChange}
      />

      <div className="helper-pill">Model Selector → choose or upload</div>
    </div>
  );
}

/* =========================
   Background Three.js scene
   Exposes a small API on window.UIScene
   ========================= */
(function initThreeBackground(){
  const mount = document.getElementById("bg3d");
  const width = mount.clientWidth;
  const height = mount.clientHeight;

  // Scene
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0d0d0f, 12, 26);

  // Camera (framed to the right)
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

  // Ground (dark) for depth
  const gMat = new THREE.MeshStandardMaterial({ color: 0x0a0e14, roughness: 1 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(30,30), gMat);
  ground.rotation.x = -Math.PI/2;
  ground.position.y = -0.2;
  ground.receiveShadow = false;
  scene.add(ground);

  // A pivot group we rotate every frame
  const modelGroup = new THREE.Group();
  modelGroup.position.set(1.4, 0.9, 0);
  scene.add(modelGroup);

  // Placeholder low-poly shape to start
  const placeholderMat = new THREE.MeshStandardMaterial({
    color: 0x7c4dff, metalness: 0.15, roughness: 0.4, flatShading: true
  });
  const placeholder = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1, 0), placeholderMat);
  modelGroup.add(placeholder);

  // Loader
  const loader = new THREE.GLTFLoader();

  // Helpers
  function disposeObject(root){
    root.traverse((obj) => {
      if (obj.isMesh) {
        obj.geometry && obj.geometry.dispose?.();
        if (obj.material) {
          // material can be an array
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach(m => {
            // textures inside materials
            for (const k in m) {
              const v = m[k];
              if (v && v.isTexture) v.dispose?.();
            }
            m.dispose?.();
          });
        }
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
    // Center the model at (0,0,0) and normalize to a target size
    const box = new THREE.Box3().setFromObject(object3D);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    object3D.position.sub(center);           // center the geometry
    const maxDim = Math.max(size.x, size.y, size.z);
    const target = 1.8;                      // desired max dimension in world units
    const scale = target / (maxDim || 1);
    object3D.scale.setScalar(scale);

    // shadows (optional)
    object3D.traverse(o => {
      if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; }
    });
  }

  let lastObjectURL = null;

  function setModelURL(url){
    loader.load(url,
      (gltf) => {
        clearModelGroup();
        const model = gltf.scene || gltf.scenes[0];
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

  // Expose simple API to UI
  window.UIScene = {
    setModelURL,
    loadFromFile,
  };

  // Resize
  function onResize(){
    const w = mount.clientWidth;
    const h = mount.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", onResize);

  // Animate
  const clock = new THREE.Clock();
  let raf;
  function animate(){
    raf = requestAnimationFrame(animate);
    const dt = clock.getDelta();
    modelGroup.rotation.y += (2 * Math.PI / 8) * dt; // ~8s per rotation
    renderer.render(scene, camera);
  }
  animate();
})();

/* =========================
   Mount the HUD
   ========================= */
const root = ReactDOM.createRoot(document.getElementById("ui-root"));
root.render(<HUD />);
