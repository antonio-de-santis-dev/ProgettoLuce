import { useEffect, useState } from "react";
import { NavLink, Route, Routes, Link, useLocation } from "react-router-dom";
import {
  Building2,
  Calculator,
  SlidersHorizontal,
  History,
  Menu,
  X,
  ArrowUpRight,
} from "lucide-react";
import Simulatore from "./business/Simulatore";
import Tariffe from "./business/Tariffe";
import Storico from "./business/Storico";
import "./business/business.css";
const nav = [
  { to: "/", name: "Simulatore", icon: Calculator },
  { to: "/tariffe", name: "Offerte e tariffe", icon: SlidersHorizontal },
  { to: "/storico", name: "Storico", icon: History },
];
export default function App() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => {
    setOpen(false);
    document.title = `${nav.find((n) => n.to === location.pathname)?.name ?? "Pagina non trovata"} · Luce Business`;
    document.querySelector<HTMLElement>("#main-content")?.focus();
    window.scrollTo(0, 0);
  }, [location.pathname]);
  return (
    <div className="app business-shell">
      <a href="#main-content" className="skip-link">
        Vai al contenuto
      </a>
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <Link className="brand" to="/">
          <span>
            <Building2 size={24} />
          </span>
          <div>
            progetto
            <strong>
              luce<span>.</span>
            </strong>
          </div>
        </Link>
        <span className="business-tag">BUSINESS</span>
        <p className="nav-caption">CONSULENZA ALLE IMPRESE</p>
        <nav aria-label="Navigazione principale">
          {nav.map((n) => (
            <NavLink
              end
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
              key={n.to}
              to={n.to}
            >
              <n.icon size={20} />
              {n.name}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="mini-sun">✳</div>
          <h3>
            Energia chiara.
            <br />
            Scelte d’impresa.
          </h3>
          <p>
            Ogni voce spiegata.
            <br />
            Ogni scenario conservato.
          </p>
          <span>LUCE BUSINESS · V1.0</span>
        </div>
      </aside>
      {open && (
        <button
          className="nav-scrim"
          aria-label="Chiudi navigazione"
          onClick={() => setOpen(false)}
        />
      )}
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-expanded={open}
              aria-label={open ? "Chiudi menu" : "Apri menu"}
              onClick={() => setOpen(!open)}
            >
              {open ? <X /> : <Menu />}
            </button>
            <span>Business</span>
            <span className="slash">/</span>
            <strong>
              {nav.find((n) => n.to === location.pathname)?.name ?? "404"}
            </strong>
          </div>
          <span className="business-local">Workspace locale</span>
        </header>
        <main id="main-content" tabIndex={-1}>
          <Routes>
            <Route path="/" element={<Simulatore />} />
            <Route path="/tariffe" element={<Tariffe />} />
            <Route path="/storico" element={<Storico />} />
            <Route
              path="*"
              element={
                <div className="empty">
                  <h1>Pagina non trovata</h1>
                  <Link to="/" className="button primary">
                    Apri il simulatore <ArrowUpRight size={18} />
                  </Link>
                </div>
              }
            />
          </Routes>
        </main>
        <footer className="workspace-footer">
          <span>ProgettoLuce Business · Consulenza energetica</span>
          <span>Simulazione parametrica · Dati e tariffe versionati</span>
        </footer>
      </div>
    </div>
  );
}
