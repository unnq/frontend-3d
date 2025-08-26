const { useState, useMemo } = React;

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
        <h1 className="hero-title">Your Hero Title Goes Here</h1>
        <p className="hero-subtitle">Simple placeholder line of hero subtitle text.</p>

        <div className="hero-actions">
          <button className="btn btn-chromatic">Button A</button>
          <button className="btn btn-white">Button B</button>
        </div>
      </div>
    </section>
  );
}

/* ----------------- A-Frame Showroom ----------------- */
function Showroom() {
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
          <div className="scene-wrap">
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

/* ----------------- App ----------------- */
function App() {
  return (
    <>
      <Nav />
      <Hero />
      <Showroom />
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
