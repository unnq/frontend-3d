const { useState, useMemo, useRef, useEffect } = React;

/* ----------------- Core UI ----------------- */
function Nav() {
  return (
    <nav className="nav">
      <div className="container">
        <span className="brand">Alter Ego Group</span>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section className="hero">
      <div className="container">
        <h1 className="hero-title">demosite</h1>
        <p className="hero-subtitle">this is a demosite for some tests</p>

        <div className="hero-actions">
          <button className="btn btn-chromatic">Colorful</button>
          <button className="btn btn-white">Plain</button>
        </div>
      </div>
    </section>
  );
}

/* ----------------- A-Frame Showroom ----------------- */
function ShowroomAFrame() {
  const [shape, setShape] = useState("box"); // "box" | "sphere" | "torus"
  const [hue, setHue] = useState(200);       // 0–360
  const [speed, setSpeed] = useState(2);     // seconds per rotation

  const color = useMemo(() => hslToHex(hue, 70, 55), [hue]);

  const Primitive = ({ shape, ...rest }) => {
    if (shape === "sphere") return <a-sphere {...rest}></a-sphere>;
    if (shape === "torus") return <a-torus radius="1" radius-tubular="0.16" {...rest}></a-torus>;
    return <a-box depth="1" height="1" width="1" {...rest}></a-box>;
  };

  return (
    <section className="modules">
      <div className="container">
        <div className="showroom">
          <div className="scene-wrap" /* A-Frame appends its canvas inside this area */>
            <a-scene embedded vr-mode-ui="enabled: false" renderer="colorManagement: true; antialias: true">
              {/* Camera */}
              <a-entity position="0 1.2 3">
                <a-camera wasd-controls-enabled="false"></a-camera>
              </a-entity>

              {/* Floor + lights */}
              <a-plane rotation="-90 0 0" width="20" height="20" color="#0a0e14"></a-plane>
              <a-entity light="type: ambient; intensity: 0.6"></a-entity>
              <a-entity light="type: directional; intensity: 0.9" position="2 4 1"></a-entity>

              {/* Controlled primitive */}
              <a-entity position="0 1 -1">
                <Primitive
                  shape={shape}
                  material={`color: ${color}; metalness: 0.2; roughness: 0.3`}
                  animation={`property: rotation; to: 0 360 0; loop: true; dur: ${speed * 1000}; easing: linear`}
                />
              </a-entity>
            </a-scene>
          </div>

          <aside className="panel">
            <div className="panel-title">Showroom Controls</div>

            <div>
              <div className="label">Shape</div>
              <div className="row">
                <button className="btn btn-white" onClick={() => setShape("box")}>Box</button>
                <button className="btn btn-white" onClick={() => setShape("sphere")}>Sphere</button>
                <button className="btn btn-white" onClick={() => setShape("torus")}>Torus</button>
              </div>
            </div>

            <div>
              <div className="label">Color Hue: {hue}°</div>
              <input
                type="range"
                min="0"
                max="360"
                value={hue}
                onChange={(e) => setHue(parseInt(e.target.value, 10))}
              />
            </div>

            <div>
              <div className="label">Rotation Speed: {speed.toFixed(1)}s</div>
              <input
                type="range"
                min="0.5"
                max="6"
                step="0.5"
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
              />
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

/* ----------------- Three.js Showroom ----------------- */
function ShowroomThree() {
  const [shape, setShape] = React.useState("box");   // "box" | "sphere" | "torus"
  const [hue, setHue] = React.useState(200);         // 0–360
  const [speed, setSpeed] = React.useState(2);       // seconds per full rotation

  const mountRef = React.useRef(null);
  const meshRef  = React.useRef(null);
  const rafRef   = React.useRef(null);
  const speedRef = React.useRef(speed);
  React.useEffect(() => { speedRef.current = speed; }, [speed]);

  React.useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth;
    const height = mount.clientHeight || 380;

    // Scene with subtle depth
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0a0e14, 6, 14);

    // Fixed camera (no orbit)
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.set(2.6, 1.8, 3.2);
    camera.lookAt(0, 1, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    mount.appendChild(renderer.domElement);

    // Lights
    const hemi = new THREE.HemisphereLight(0xffffff, 0x0a0e14, 0.7);
    const dir  = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(3, 5, 2);
    dir.castShadow = true;
    dir.shadow.mapSize.set(1024, 1024);
    scene.add(hemi, dir);

    // Floor
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x0a0e14, roughness: 0.95, metalness: 0.0 });
    const floor    = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Mesh (geometry can change later)
    const material = new THREE.MeshStandardMaterial({ color: new THREE.Color(hslToHex(hue, 70, 55)), metalness: 0.2, roughness: 0.3 });
    const mesh     = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
    mesh.position.set(0, 1, 0);
    mesh.castShadow = true;
    scene.add(mesh);
    meshRef.current = mesh;

    // Resize
    const onResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight || 380;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    // Animate (delta-based for live speed changes)
    const clock = new THREE.Clock();
    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      const radiansPerSec = (2 * Math.PI) / Math.max(0.0001, speedRef.current);
      mesh.rotation.y += radiansPerSec * dt;
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      mesh.geometry?.dispose();
      material.dispose();
      floor.geometry?.dispose();
      floorMat.dispose();
    };
  }, []); // init once

  // Update geometry on shape change
  React.useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const old = mesh.geometry;
    if (shape === "sphere") {
      mesh.geometry = new THREE.SphereGeometry(0.75, 48, 48);
    } else if (shape === "torus") {
      mesh.geometry = new THREE.TorusGeometry(1, 0.16, 24, 120);
    } else {
      mesh.geometry = new THREE.BoxGeometry(1, 1, 1);
    }
    old?.dispose();
  }, [shape]);

  // Update color on hue change
  React.useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.material.color.set(hslToHex(hue, 70, 55));
  }, [hue]);

  return (
    <section className="modules">
      <div className="container">
        <div className="showroom">
          <div className="scene-wrap" ref={mountRef}></div>

          <aside className="panel">
            <div className="panel-title">Showroom Controls</div>

            <div>
              <div className="label">Shape</div>
              <div className="row">
                <button className="btn btn-white" onClick={() => setShape("box")}>Box</button>
                <button className="btn btn-white" onClick={() => setShape("sphere")}>Sphere</button>
                <button className="btn btn-white" onClick={() => setShape("torus")}>Torus</button>
              </div>
            </div>

            <div>
              <div className="label">Color Hue: {hue}°</div>
              <input
                type="range"
                min="0"
                max="360"
                value={hue}
                onChange={(e) => setHue(parseInt(e.target.value, 10))}
              />
            </div>

            <div>
              <div className="label">Rotation Speed: {speed.toFixed(1)}s</div>
              <input
                type="range"
                min="0.5"
                max="6"
                step="0.5"
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
              />
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}




/* ----------------- App ----------------- */
function App() {
  return (
    <>
      <Nav />
      <Hero />
      <ShowroomAFrame />
      <ShowroomThree />
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);

/* ----------------- Utils ----------------- */
function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let [r, g, b] = [0, 0, 0];
  if (0 <= h && h < 60) [r, g, b] = [c, x, 0];
  else if (60 <= h && h < 120) [r, g, b] = [x, c, 0];
  else if (120 <= h && h < 180) [r, g, b] = [0, c, x];
  else if (180 <= h && h < 240) [r, g, b] = [0, x, c];
  else if (240 <= h && h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const toHex = (v) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
