// js/musicplayer.jsx
const { useState, useMemo, useRef } = React;
const ReactPlayer = window.ReactPlayer; // UMD global

// Minimal ghost button & chips use your existing fonts/colors (CSS added in step 4)
function MusicPlayer() {
  // ---- Seed data (edit/expand freely) ----
  const initial = [
    { title: "LOST CHAPTER (PSX loop)", url: "https://www.youtube.com/watch?v=B0Tyo91sNc8", genres: ["lofi","ambient"] },
    { title: "Night Drive",             url: "https://www.youtube.com/watch?v=Zi_XLOBDo_Y",   genres: ["synthwave"] },
    { title: "Low-Key Beats",           url: "https://www.youtube.com/watch?v=5qap5aO4i9A",  genres: ["lofi","hiphop"] },
    { title: "City Jazz",               url: "https://www.youtube.com/watch?v=Dx5qFachd3A",  genres: ["jazz"] },
  ];

  const GENRES = ["lofi","ambient","synthwave","hiphop","jazz"];

  // ---- State ----
  const [playlist, setPlaylist] = useState(initial);
  const [currentUrl, setCurrentUrl] = useState(initial[0].url);
  const [currentTitle, setCurrentTitle] = useState(initial[0].title);
  const [isPlaying, setIsPlaying] = useState(true);
  const [muted, setMuted] = useState(true); // start muted; unmute on first Play
  const [volume, setVolume] = useState(0.7);

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(() => new Set()); // selected genres

  const playerRef = useRef(null);

  // ---- Derived: filtered list ----
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return playlist.filter(item => {
      const textOk = !q || item.title.toLowerCase().includes(q);
      const genreOk = selected.size === 0 || item.genres.some(g => selected.has(g));
      return textOk && genreOk;
    });
  }, [playlist, search, selected]);

  // ---- Handlers ----
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
    const genres = []; // you can type a comma list later if you want
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
    try { playerRef.current?.seekTo(0, "seconds"); } catch {} 
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

      {/* Player box (transparent; just size the video) */}
      <div className="player-box">
        <ReactPlayer
          ref={playerRef}
          url={currentUrl}
          playing={isPlaying}
          muted={muted}
          volume={volume}
          width="100%"
          height="100%"
          config={{ youtube: { playerVars: { rel: 0 } } }}
        />
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
        {filtered.length === 0 && (
          <li className="list-empty">No matches.</li>
        )}
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

// Expose as global so <MusicPlayer /> works in uipage.jsx
window.MusicPlayer = MusicPlayer;
