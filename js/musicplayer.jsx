// js/musicplayer.jsx — Music UI using YouTube IFrame API (no ReactPlayer)
const { useState, useMemo, useRef, useEffect } = React;

// ---- small helper: extract a YouTube video id from many URL shapes ----
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

function MusicPlayer() {
  // ---- seed data (edit/expand freely) ----
  const initial = [
    { title: "LOST CHAPTER (PSX loop)", url: "https://www.youtube.com/watch?v=B0Tyo91sNc8", genres: ["lofi","ambient"] },
    { title: "Night Drive",             url: "https://www.youtube.com/watch?v=Zi_XLOBDo_Y",   genres: ["synthwave"] },
    { title: "Low-Key Beats",           url: "https://www.youtube.com/watch?v=5qap5aO4i9A",  genres: ["lofi","hiphop"] },
    { title: "City Jazz",               url: "https://www.youtube.com/watch?v=Dx5qFachd3A",  genres: ["jazz"] },
  ];
  const GENRES = ["lofi","ambient","synthwave","hiphop","jazz"];

  // ---- state ----
  const [playlist, setPlaylist] = useState(initial);
  const [currentUrl, setCurrentUrl] = useState(initial[0].url);
  const [currentTitle, setCurrentTitle] = useState(initial[0].title);
  const [isPlaying, setIsPlaying] = useState(true);
  const [muted, setMuted] = useState(true); // start muted for autoplay
  const [volume, setVolume] = useState(0.7);

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(() => new Set());

  // ---- player refs ----
  const playerDivRef = useRef(null);   // container div for YT API
  const playerRef = useRef(null);      // YT.Player instance
  const [apiReady, setApiReady] = useState(!!(window.YT && window.YT.Player));

  // Load the IFrame API once
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

  // Create the player once the API is ready
  useEffect(() => {
    if (!apiReady || !playerDivRef.current || playerRef.current) return;

    const videoId = getYouTubeId(currentUrl);
    playerRef.current = new window.YT.Player(playerDivRef.current, {
      width: "100%",
      height: "100%",
      videoId,
      playerVars: {
        rel: 0,
        playsinline: 1,
        autoplay: isPlaying ? 1 : 0,
        mute: muted ? 1 : 0,
      },
      events: {
        onReady: (e) => {
          try { e.target.setVolume(Math.round(volume * 100)); } catch {}
        }
      }
    });

    return () => {
      try { playerRef.current?.destroy?.(); } catch {}
      playerRef.current = null;
    };
  }, [apiReady]); // run once

  // React to URL changes (load new video)
  useEffect(() => {
    const p = playerRef.current;
    if (!p) return;
    const id = getYouTubeId(currentUrl);
    if (!id) return;
    try {
      p.loadVideoById({ videoId: id });
      if (muted) p.mute(); else p.unMute();
      if (isPlaying) p.playVideo(); else p.pauseVideo();
      p.setVolume(Math.round(volume * 100));
    } catch {}
  }, [currentUrl]);

  // React to play/pause/mute/volume changes
  useEffect(() => {
    const p = playerRef.current;
    if (!p) return;
    try {
      if (isPlaying) p.playVideo(); else p.pauseVideo();
    } catch {}
  }, [isPlaying]);

  useEffect(() => {
    const p = playerRef.current;
    if (!p) return;
    try { if (muted) p.mute(); else p.unMute(); } catch {}
  }, [muted]);

  useEffect(() => {
    const p = playerRef.current;
    if (!p) return;
    try { p.setVolume(Math.round(volume * 100)); } catch {}
  }, [volume]);

  // ---- derived: filtered list ----
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return playlist.filter(item => {
      const textOk = !q || item.title.toLowerCase().includes(q);
      const genreOk = selected.size === 0 || item.genres.some(g => selected.has(g));
      return textOk && genreOk;
    });
  }, [playlist, search, selected]);

  // ---- handlers ----
  function toggleGenre(tag) {
    const next = new Set(selected);
    if (next.has(tag)) next.delete(tag); else next.add(tag);
    setSelected(next);
  }
  function choose(item) {
    setCurrentUrl(item.url);
    setCurrentTitle(item.title);
    setIsPlaying(true);
    setMuted(false); // user interacted → unmute
  }
  function addUrl(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const url = form.url.value.trim();
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
  function stop()  {
    setIsPlaying(false);
    const p = playerRef.current;
    try { p.stopVideo(); } catch {}
  }

  return (
    <div className="music-wrap">
      {/* Header row */}
      <div className="row music-top">
        <div className="nowplaying">
          <span className="label">Now Playing:</span> {currentTitle}
        </div>
        <div className="controls">
          <button className="btn-ghost" onClick={play}  title="Play">▶</button>
          <button className="btn-ghost" onClick={pause} title="Pause">⏸</button>
          <button className="btn-ghost" onClick={stop}  title="Stop">■</button>

          <label className="label vol-label">Vol</label>
          <input
            type="range"
            min="0" max="1" step="0.01"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
          />
        </div>
      </div>

      {/* Player box */}
      <div className="player-box">
        <div ref={playerDivRef} style={{ width: "100%", height: "100%" }} />
      </div>

      {/* Search + chips */}
      <div className="row">
        <input
          className="input"
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ minWidth: 200 }}
        />
        <div className="chips">
          {GENRES.map(tag => (
            <button
              key={tag}
              className={`chip ${selected.has(tag) ? "is-active" : ""}`}
              onClick={() => toggleGenre(tag)}
            >
              {tag}
            </button>
          ))}
          {selected.size > 0 && (
            <button className="chip clear" onClick={() => setSelected(new Set())}>clear</button>
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
              {item.genres.length > 0 && (
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
  );
}

// expose globally so <MusicPlayer /> works from uipage.jsx
window.MusicPlayer = MusicPlayer;
