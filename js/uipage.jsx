const { useEffect, useRef, useState } = React;

/* =========================
   UI Overlay
   ========================= */
function SideMenu({ active, onSelect }) {
  const items = [
    { key: "start",    label: "Start" },
    { key: "missions", label: "Missions" },
    { key: "worlds",   label: "Worlds" },
    { key: "arsenal",  label: "Arsenal" },
    { key: "settings", label: "Settings" },
    { key: "exit",     label: "Exit" },
  ];

  return (
    <nav className="side-menu" aria-label="Main menu">
      <div className="menu-title">demosite ui</div>
      <ul className="menu-list">
        {items.map(it => (
          <li key={it.key}>
            {/* use button for accessibility; style like link */}
            <button
              className={`menu-item ${active === it.key ? "is-active" : ""}`}
              onClick={() => onSelect(it.key)}
            >
              {it.label}
            </button>
          </li>
        ))}
      </ul>
      <div className="menu-hint">Use this menu to navigate your world.</div>
    </nav>
  );
}

function HUD() {
  const [active, setActive] = useState("start");
  return (
    <div className="hud">
      <SideMenu active={active} onSelect={setActive} />
      <div className="hud-right" />
      <div className="helper-pill">SPACE MONO • low-poly UI</div>
    </div>
  );
}

/* =========================
   Background Scene (placeholder)
   ========================= */
function useThreeBackground(mountEl) {
  useEffect(() => {
    if (!mountEl) return;

    // Sizes
    const width = mountEl.clientWidth;
    const height = mountEl.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0d0d0f, 12, 26);

    // Camera (offset slightly to look right side)
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.set(2.8, 1.6, 4.0);
    camera.lookAt(1.0, 0.8, 0.0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x0d0d0f, 1); // match page bg
    mountEl.appendChild(renderer.domElement);

    // Lights (soft hemi + directional)
    const hemi = new THREE.HemisphereLight(0xffffff, 0x0a0e14, 0.65);
    const dir  = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(2.5, 4.0, 1.5);
    scene.add(hemi, dir);

    // Placeholder “low poly” object on the right
    const mat = new THREE.MeshStandardMaterial({
      color: 0x7c4dff,
      metalness: 0.15,
      roughness: 0.4,
      flatShading: true,
    });
    const geo = new THREE.IcosahedronGeometry(1.1, 0); // low-poly
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(1.4, 1.0, 0);
    scene.add(mesh);

    // Subtle ground plane for depth (dark)
    const gMat = new THREE.MeshStandardMaterial({ color: 0x0a0e14, roughness: 1 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), gMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.2;
    scene.add(ground);

    // Animate
    const clock = new THREE.Clock();
    let raf = null;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      mesh.rotation.y += (2 * Math.PI / 8) * dt; // ~8s per rotation
      renderer.render(scene, camera);
    };
    animate();

    // Resize handling
    const onResize = () => {
      const w = mountEl.clientWidth;
      const h = mountEl.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    // Cleanup
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      geo.dispose(); mat.dispose();
      ground.geometry.dispose(); gMat.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    };
  }, [mountEl]);
}

/* Root component: mounts 3D and renders HUD */
function UIPage() {
  const bgRef = useRef(null);

  // Mount Three.js into #bg3d
  useEffect(() => {
    useThreeBackground(bgRef.current);
  }, []);

  return (
    <>
      {/* background mount target */}
      <div ref={bgRef} id="bg3d"></div>

      {/* overlay HUD */}
      <div id="ui-root">
        <HUD />
      </div>
    </>
  );
}

/* Mount the page */
const root = ReactDOM.createRoot(document.getElementById("ui-root"));
/* We render HUD via UIPage; UIPage also ensures bg3d is present. */
root.render(<HUD />);

/* Also kick off the background Three.js mount */
(() => {
  const bgEl = document.getElementById("bg3d");
  // run the background scene hook imperatively
  // (since we rendered HUD directly above)
  const mountBackground = () => {
    // Minimal inline copy of the hook logic to avoid extra React root:
    const width = bgEl.clientWidth, height = bgEl.clientHeight;
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0d0d0f, 12, 26);
    const camera = new THREE.PerspectiveCamera(60, width/height, 0.1, 100);
    camera.position.set(2.8, 1.6, 4.0);
    camera.lookAt(1.0, 0.8, 0.0);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x0d0d0f, 1);
    bgEl.appendChild(renderer.domElement);
    const hemi = new THREE.HemisphereLight(0xffffff, 0x0a0e14, 0.65);
    const dir  = new THREE.DirectionalLight(0xffffff, 0.9); dir.position.set(2.5, 4.0, 1.5);
    scene.add(hemi, dir);
    const mat = new THREE.MeshStandardMaterial({ color: 0x7c4dff, metalness: 0.15, roughness: 0.4, flatShading: true });
    const geo = new THREE.IcosahedronGeometry(1.1, 0);
    const mesh = new THREE.Mesh(geo, mat); mesh.position.set(1.4, 1.0, 0); scene.add(mesh);
    const gMat = new THREE.MeshStandardMaterial({ color: 0x0a0e14, roughness: 1 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(30,30), gMat); ground.rotation.x = -Math.PI/2; ground.position.y = -0.2; scene.add(ground);
    const clock = new THREE.Clock(); let raf;
    const animate = () => { raf = requestAnimationFrame(animate); mesh.rotation.y += (2*Math.PI/8)*clock.getDelta(); renderer.render(scene,camera); };
    animate();
    const onResize = () => { const w=bgEl.clientWidth, h=bgEl.clientHeight; renderer.setSize(w,h); camera.aspect=w/h; camera.updateProjectionMatrix(); };
    window.addEventListener("resize", onResize);
  };
  mountBackground();
})();
