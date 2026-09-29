// App shell — top bar + mobile bottom nav + page outlet.

import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV = [
  { to: "/", label: "Home", icon: "🏠", end: true },
  { to: "/lists", label: "Lists", icon: "📚" },
  { to: "/players", label: "Players", icon: "👤" },
];

export default function Layout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="ks-app-shell">
      <header className="topbar">
        <div className="ks-container topbar-inner">
          <NavLink to="/" className="topbar-title">
            <span aria-hidden>👑</span> Kingdom Spellers
          </NavLink>
          <div className="topbar-spacer" />
          {user && (
            <>
              <span className="ks-small" style={{ color: "rgba(255,255,255,0.8)" }}>
                {user.name || user.email}
              </span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={handleSignOut}>
                Sign out
              </button>
            </>
          )}
        </div>
      </header>

      <main className="ks-container page">
        <Outlet />
      </main>

      <nav className="bottomnav" aria-label="Main navigation">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `bottomnav-btn${isActive ? " active" : ""}`}
          >
            <span aria-hidden style={{ fontSize: "1.3rem" }}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
