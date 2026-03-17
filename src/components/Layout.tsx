import { Link, Outlet } from 'react-router-dom';

export function Layout() {
  return (
    <div className="layout">
      <header className="header">
        <Link to="/" className="logo">
          <span className="logo-main">IPL</span> Fantasy
        </Link>
        <nav>
          <Link to="/">Leaderboard</Link>
          <Link to="/matches">Matches</Link>
          <Link to="/graph">Graph</Link>
          <Link to="/ledger">Ledger</Link>
          <Link to="/admin" className="admin-link">Admin</Link>
        </nav>
      </header>
      <main className="main">
        <Outlet />
      </main>
      <footer className="footer">
        <span>Dream11 Contest Tracker</span>
      </footer>
    </div>
  );
}
