const { useState } = React;
const MusicPlayer = window.MusicPlayer;

/* Side Menu */
function SideMenu({ active, onSelect, onToggleModelMenu, showModelMenu, onPickModel, onUploadClick }) {
  const items = [
    { key: "start",    label: "Start" },
    { key: "model",    label: "Model Selector" },
    { key: "music",    label: "Music" },
    { key: "worlds",   label: "Worlds" },
    { key: "settings", label: "Settings" },
    { key: "exit",     label: "Exit" },
  ];

  // Your models (paths are case-sensitive on GH Pages)
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
                if (it.key === "exit") { window.location.href = "./index.html"; return; } // go home
                if (it.key === "model") onToggleModelMenu();
                else onSelect(it.key);
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

/* HUD wrapper */
function HUD() {
  const [active, setActive] = React.useState("start");
  const [showModelMenu, setShowModelMenu] = React.useState(false);

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
