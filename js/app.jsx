const { createElement: h, useState } = React;

/**
 * Components kept as lean as possible to match your requested structure.
 * Typography is controlled in CSS; we only render the elements you asked for.
 */

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
        <p className="hero-subtitle">
          Simple placeholder line of hero subtitle text.
        </p>

        <div className="hero-actions">
          <button className="btn btn-chromatic">Button A</button>
          <button className="btn btn-white">Button B</button>
        </div>
      </div>
    </section>
  );
}

function ModulesSection() {
  // Empty container for future demo modules—intentionally no content.
  return (
    <section className="modules">
      <div className="container" />
    </section>
  );
}

function App() {
  return (
    <>
      <Nav />
      <Hero />
      <ModulesSection />
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
