const { useState } = React;
const MusicPlayer = window.MusicPlayer;

/* Side Menu */
function SideMenu({
  active,
  onSelect,
  onToggleModelMenu,
  showModelMenu,
  onPickModel,
  onUploadClick,
  onWorlds,            // NEW
}) {
  const items = [
    { key: "start",    label: "Start" },
    { key: "model",    label: "Model Selector" },
    { key: "music",    label: "Music" },
    { key: "worlds",   label: "Worlds" },      // triggers confirm
    { key: "settings", label: "Settings" },
    { key: "exit",     label: "Exit" },
  ];

  const MODEL_OPTIONS = [
    { key: "modelA", label: "Model A", url: "assets/models/bmw_m3_gtr_-_psx_style_mw_2012_java.glb" },
    { key: "modelB", label: "Model B", url: "assets/models/macbook_psx_style.glb" },
    { key: "modelC", label: "Model C", url: "assets/models/psx_box_of_cheez_it_crackers.glb" },
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
                if (it.key === "exit")   { window.location.href = "./index.html"; return; }
                if (it.key === "worlds") { onWorlds?.(); return; }      // NEW
                if (it.key === "model")  { onToggleModelMenu(); }
                else { onSelect(it.key); }
              }}
            >
              {it.label}
            </button>

            {it.key === "model" && showModelMenu && (
              <ul className="menu-sub">
                {MODEL_OPTIONS.map(opt => (
                  <li key={opt.key}>
                    <button className="menu-item-sub" onClick={() => onPickModel(opt.url)} title={opt.url}>
                      {opt.label}
                    </button>
                  </li>
                ))}
                <li>
                  <button className="menu-item-sub" onClick={onUploadClick}>Upload .glb / .gltf…</button>
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

function WorldsConfirm({ open, onConfirm, onCancel }) {
  // backdrop click + Esc/Enter
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter")  onConfirm();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onConfirm, onCancel]);

  return (
    <div
      className={`worlds-overlay ${open ? "is-open" : "is-closed"}`}
      aria-hidden={!open}
      onClick={onCancel}               // click backdrop = No
    >
      <div className="worlds-panel" onClick={(e) => e.stopPropagation()}>
        <div className="worlds-title">Are you sure?</div>
        <div className="worlds-actions">
          <button className="menu-item" onClick={onConfirm}>Yes</button>
          <button className="menu-item" onClick={onCancel}>No</button>
        </div>
      </div>
    </div>
  );
}


/* HUD wrapper */
function HUD() {
  const [active, setActive] = React.useState("start");
  const [showModelMenu, setShowModelMenu] = React.useState(false);
  const [showWorldsConfirm, setShowWorldsConfirm] = React.useState(false); // NEW

  // file upload (unchanged)
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
    window.UIScene?.loadFromFile(file);
    e.target.value = "";
    setShowModelMenu(false);
  };

  const pickModel = (url) => {
    window.UIScene?.setModelURL(url);
    setShowModelMenu(false);
  };

  // Worlds flow
  const openWorldsConfirm = () => {
    setActive("worlds");
    window.UIScene?.moveTo?.("worlds");   // optional camera slide
    setShowWorldsConfirm(true);
  };
  const confirmWorlds = () => {
    window.location.href = "https://unnq.github.io/3d-webgl-test/environment.html";
  };
  const cancelWorlds = () => {
    setShowWorldsConfirm(false);
    setActive("start");
    window.UIScene?.moveTo?.("start");    // optional camera slide back
  };

  return (
    <div className="hud">
      <SideMenu
        active={active}
        onSelect={(k) => { 
          if (k !== "worlds") { setActive(k); setShowModelMenu(false); } 
        }}
        onToggleModelMenu={() => { setActive("model"); setShowModelMenu(v => !v); }}
        showModelMenu={showModelMenu}
        onPickModel={pickModel}
        onUploadClick={onUploadClick}
        onWorlds={openWorldsConfirm}          // NEW
      />

      <div className="hud-right" />
      <input ref={setFileRef} type="file" accept=".glb,.gltf" style={{ display: "none" }} onChange={onFileChange} />
      <div className="helper-pill">Model Selector → choose or upload</div>

      {/* Worlds confirmation overlay */}
      <WorldsConfirm open={showWorldsConfirm} onConfirm={confirmWorlds} onCancel={cancelWorlds} />
    </div>
  );
}


  const pickModel = (url) => {
    window.UIScene?.setModelURL(url);
    setShowModelMenu(false);
  };

  return (
    <div className="hud">
      {/* Hide the left menu while in Music */}
      {active !== "music" && (
        <SideMenu
          active={active}
          onSelect={(k) => {
            if (k !== "exit") window.UIScene?.moveTo(k);
            setActive(k);
            setShowModelMenu(false);
          }}
          onToggleModelMenu={() => {
            window.UIScene?.moveTo("model");
            setActive("model");
            setShowModelMenu((v) => !v);
          }}
          showModelMenu={showModelMenu}
          onPickModel={pickModel}
          onUploadClick={onUploadClick}
        />
      )}

      {/* Right side placeholder (unused now, keep if you like) */}
      <div className="hud-right" />

      {/* Hidden file input for Model Selector uploads */}
      <input
        ref={setFileRef}
        type="file"
        accept=".glb,.gltf"
        style={{ display: "none" }}
        onChange={onFileChange}
      />

      {/* Only show the helper pill while in Model */}
      {active === "model" && (
        <div className="helper-pill">Model Selector → choose or upload</div>
      )}

      {/* Music is ALWAYS mounted so playback persists.
          expanded=true shows the centered overlay; false shows the mini-player bar */}
      <MusicPlayer
        expanded={active === "music"}
        onBack={() => {
          setActive("start");
          setShowModelMenu(false);
          window.UIScene?.moveTo("start");
        }}
      />
    </div>
  );
}



/* Mount the HUD */
const root = ReactDOM.createRoot(document.getElementById("ui-root"));
root.render(<HUD />);
