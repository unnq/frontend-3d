// js/musicplayer.jsx — Music UI using YouTube IFrame API
const { useState, useMemo, useRef, useEffect } = React;

function getYouTubeId(u) {
  try {
    const url = new URL(u);
    if (url.hostname === "youtu.be") return url.pathname.slice(1);
    if (url.hostname.includes("youtube.com")) {
      if (url.pathname.startsWith("/embed/")) return url.pathname.split("/embed/")[1];
      return url.searchParams.get("v");
    }
  } catch {}
  return "";
}

function MusicPlayer({ expanded = false, onBack = () => {} }) {
  // ---- seed data (fallback if playlist.json missing) ----
  const initial = [
    { title: "LOST CHAPTER (PSX loop)", url: "https://www.youtube.com/watch?v=B0Tyo91sNc8", genres: ["90s","ambient","vaporwave","lofi"] },
    { title: "Night Drive",             url: "https://www.youtube.com/watch?v=Zi_XLOBDo_Y",   genres: ["synthwave"] },
    { title: "Low-Key Beats",           url: "https://www.youtube.com/watch?v=5qap5aO4i9A",  genres: ["lofi","hiphop"] },
    { title: "City Jazz",               url: "https://www.youtube.com/watch?v=Dx5qFachd3A",  genres: ["jazz"] },
  ];

  // ---- state ----
  const [playlist, setPlaylist]         = useState(initial);
  const [currentUrl, setCurrentUrl]     = useState(initial[0].url);
  const [currentTitle, setCurrentTitle] = useState(initial[0].title);
  const [isPlaying, setIsPlaying]       = useState(true);
  const [muted, setMuted]               = useState(true); // start muted for autoplay
  const [volume, setVolume]             = useState(0.7);

  const [search, setSearch]             = useState("");
  const [selected, setSelected]         = useState(() => new Set());

  // ---- Add Filters overlay state ----
  const [filtersOpen, setFiltersOpen]   = useState(false);
  const [filterSearch, setFilterSearch] = useState("");

  // ---- genre stats (popularity) derived from the current playlist ----
  const genreStats = useMemo(() => {
    const map = new Map();
    playlist.forEach(item => (item.genres || []).forEach(g => {
      const key = String(g).trim();
      if (!key) return;
      map.set(key, (map.get(key) || 0) + 1);
    }));
    // sort by count desc, then A→Z
    return Array.from(map.entries()).sort((a,b) => (b[1]-a[1]) || a[0].localeCompare(b[0]));
  }, [playlist]);

  // filter the genre list by overlay search
  const genreList = useMemo(() => {
    const q = filterSearch.trim().toLowerCase();
    if (!q) return genreStats;
    return genreStats.filter(([g]) => g.toLowerCase().includes(q));
  }, [genreStats, filterSearch]);

  // ---- YT Player ----
  const playerDivRef = useRef(null);
  const playerRef    = useRef(null);
  const [apiReady, setApiReady] = useState(!!(window.YT && window.YT.Player));

  useEffect(() => {
    if (apiReady) return;
    if (window.YT && window.YT.Player) { setApiReady(true); return; }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function() {
      prev && prev();
      setApiReady(true);
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(tag);
  }, [apiReady]);

  useEffect(() => {
    if (!apiReady || !playerDivRef.current || playerRef.current) return;
    const videoId = getYouTubeId(currentUrl);
    playerRef.current = new window.YT.Player(playerDivRef.current, {
      width: "100%",
      height: "100%",
      videoId,
      playerVars: { rel: 0, playsinline: 1, autoplay: isPlaying ? 1 : 0, mute: muted ? 1 : 0 },
      events: {
        onReady: (e) => { try { e.target.setVolume(Math.round(volume * 100)); } catch {} }
      }
    });
    return () => {
      try { playerRef.current?.destroy?.(); } catch {}
      playerRef.current = null;
    };
  }, [apiReady]); // once

  // optional: load external playlist JSON (keeps your JSX clean)
  useEffect(() => {
    fetch("./assets/data/playlist.json", { cache: "no-store" })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => {
        if (Array.isArray(data) && data.length) {
          setPlaylist(data);
          setCurrentUrl(data[0].url);
          setCurrentTitle(data[0].title);
        }
      })
      .catch(() => {/* ignore if missing */});
  }, []);

  // React to URL / controls
  useEffect(() => {
    const p = playerRef.current; if (!p) return;
    const id = getYouTubeId(currentUrl); if (!id) return;
    try {
      p.loadVideoById({ videoId: id });
      if (muted) p.mute(); else p.unMute();
      if (isPlaying) p.playVideo(); else p.pauseVideo();
      p.setVolume(Math.round(volume * 100));
    } catch {}
  }, [currentUrl]);

  useEffect(() => { const p = playerRef.current; if (!p) return; try { isPlaying ? p.playVideo() : p.pauseVideo(); } catch {} }, [isPlaying]);
  useEffect(() => { const p = playerRef.current; if (!p) return; try { muted ? p.mute() : p.unMute(); } catch {} }, [muted]);
  useEffect(() => { const p = playerRef.current; if (!p) return; try { p.setVolume(Math.round(volume * 100)); } catch {} }, [volume]);

  // Derived filtered list
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return playlist.filter(item => {
      const textOk  = !q || item.title.toLowerCase().includes(q);
      const genreOk = selected.size === 0 || (item.genres || []).some(g => selected.has(g));
      return textOk && genreOk;
    });
  }, [playlist, search, selected]);

  // Handlers
  function toggleGenre(tag) {
    const next = new Set(selected);
    if (next.has(tag)) next.delete(tag); else next.add(tag);
    setSelected(next);
  }
  function clearSelected() { setSelected(new Set()); }

  function choose(item) {
    setCurrentUrl(item.url);
    setCurrentTitle(item.title);
    setIsPlaying(true);
    setMuted(false);
  }
  function addUrl(e) {
    e.preventDefault();
    const form  = e.currentTarget;
    const url   = form.url.value.trim();
    const title = form.title.value.trim() || "Custom";
    if (!url) return;
    const genres = [];
    const next = [{ title, url, genres }, ...playlist];
    setPlaylist(next);
    setCurrentUrl(url);
    setCurrentTitle(title);
    setIsPlaying(true);
    setMuted(false);
    form.reset();
  }
  function play()  { setIsPlaying(true);  setMuted(false); }
  function pause() { setIsPlaying(false); }
  function stop()  { setIsPlaying(false); try { playerRef.current?.stopVideo(); } catch {} }

  // helpers for overlay bulk actions
  function selectVisibleGenres() {
    const next = new Set(selected);
    genreList.forEach(([g]) => next.add(g));
    setSelected(next);
  }

  return (
    <>
      {/* Always-mounted (invisible when not expanded) overlay */}
      <div className={`music-overlay ${expanded ? "is-open" : "is-closed"}`} aria-hidden={!expanded}>
        <div className="music-panel">
          <div className="row music-top">
            <button className="btn-ghost music-back" onClick={onBack}>← Back</button>
            <div className="nowplaying"><span className="label">Now Playing:</span> {currentTitle}</div>
            <div className="controls">
              <button className="btn-ghost" onClick={play}  title="Play">▶</button>
              <button className="btn-ghost" onClick={pause} title="Pause">⏸</button>
              <button className="btn-ghost" onClick={stop}  title="Stop">■</button>
              <label className="label vol-label">Vol</label>
              <input type="range" min="0" max="1" step="0.01" value={volume}
                     onChange={(e) => setVolume(parseFloat(e.target.value))}/>
            </div>
          </div>

          <div className="player-box">
            {/* Keep the iframe mounted even when overlay is closed */}
            <div ref={playerDivRef} style={{ width: "100%", height: "100%" }} />
          </div>

          {/* Search + selected chips + “Add filters” */}
          <div className="row" style={{ alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <input
              className="input"
              placeholder="Search titles…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ minWidth: 200 }}
            />
            <div className="chips" style={{ flex: 1 }}>
              {[...selected].map(tag => (
                <button
                  key={tag}
                  className="chip is-active"
                  onClick={() => toggleGenre(tag)}
                  title="Remove filter"
                >
                  {tag} ✕
                </button>
              ))}
              <button className="chip" onClick={() => setFiltersOpen(true)}>
                + Add filters{selected.size ? ` (${selected.size})` : ""}
              </button>
              {selected.size > 0 && (
                <button className="chip clear" onClick={clearSelected}>clear</button>
              )}
            </div>
          </div>

          {/* Playlist */}
          <ul className="list">
            {filtered.map(item => (
              <li key={item.url}>
                <button
                  className={`list-item ${item.url === currentUrl ? "is-active" : ""}`}
                  onClick={() => choose(item)}
                  title={item.url}
                >
                  {item.title}
                  {(item.genres && item.genres.length > 0) && (
                    <span className="meta"> · {item.genres.join(", ")}</span>
                  )}
                </button>
              </li>
            ))}
            {filtered.length === 0 && <li className="list-empty">No matches.</li>}
          </ul>

          {/* Add your own */}
          <form className="row add-form" onSubmit={addUrl}>
            <input className="input" name="title" placeholder="Title (optional)" />
            <input className="input" name="url" placeholder="Paste YouTube URL…" />
            <button className="btn-ghost" type="submit">Add</button>
          </form>
        </div>
      </div>

      {/* Mini-player bar (shows when not expanded) */}
      {!expanded && (
        <div className="miniplayer">
          <div className="mini-left">
            <span className="mini-label">Now Playing:</span> {currentTitle}
          </div>
          <div className="mini-controls">
            <button className="btn-ghost" onClick={play}  title="Play">▶</button>
            <button className="btn-ghost" onClick={pause} title="Pause">⏸</button>
            <label className="label vol-label">Vol</label>
            <input type="range" min="0" max="1" step="0.01" value={volume}
                   onChange={(e) => setVolume(parseFloat(e.target.value))}/>
          </div>
        </div>
      )}

      {/* ===== Genre Picker Overlay ===== */}
      <div className={`filters-overlay ${filtersOpen ? "is-open" : "is-closed"}`} aria-hidden={!filtersOpen}>
        <div className="filters-panel">
          <div className="filters-header">
            <button className="btn-ghost" onClick={() => setFiltersOpen(false)}>← Back</button>
            <div className="label" style={{ marginLeft: 8 }}>Filter by genre</div>
            <div className="filters-actions">
              <button className="btn-ghost" onClick={selectVisibleGenres}>Select visible</button>
              <button className="btn-ghost" onClick={clearSelected}>Clear all</button>
            </div>
          </div>

          <div className="filters-search">
            <input
              className="input"
              placeholder="Find genres…"
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
            />
          </div>

          <div className="filters-list">
            {genreList.map(([g, count]) => (
              <label key={g} className="filter-row">
                <input
                  type="checkbox"
                  checked={selected.has(g)}
                  onChange={() => toggleGenre(g)}
                />
                <span>{g}</span>
                <span className="filter-count">({count})</span>
              </label>
            ))}
            {genreList.length === 0 && <div className="list-empty">No tags.</div>}
          </div>

          <div className="filters-footer" style={{ display: "flex", justifyContent: "flex-end" }}>
            <button className="btn-ghost" onClick={() => setFiltersOpen(false)}>Done</button>
          </div>
        </div>
      </div>
    </>
  );
}

// expose globally so <MusicPlayer /> works from uipage.jsx
window.MusicPlayer = MusicPlayer;
