import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isAdminAuthenticated, adminLogout } from '../../lib/api';
import { useSeasons } from '../../lib/useSeasons';

export function AdminDashboard() {
  const [auth, setAuth] = useState<boolean | null>(null);
  const { seasons } = useSeasons();
  const navigate = useNavigate();

  useEffect(() => {
    isAdminAuthenticated().then((ok) => {
      setAuth(ok);
      if (!ok) navigate('/admin/login');
    });
  }, [navigate]);

  const handleLogout = () => {
    adminLogout();
    navigate('/admin/login');
  };

  if (auth === null) return <div className="loading">Loading...</div>;
  if (!auth) return null;

  return (
    <div className="page admin-dashboard">
      <div className="admin-header">
        <h1>Admin</h1>
        <button onClick={handleLogout} className="logout-btn">Logout</button>
      </div>
      <div className="admin-links">
        <Link to="/admin/matches">Manage Matches</Link>
        <Link to="/admin/participants">Manage Participants</Link>
        <Link to="/admin/config">Payout Config</Link>
      </div>
      {seasons.length === 0 && (
        <p className="empty">No season found. Create one in Supabase: <code>INSERT INTO seasons (name) VALUES ('IPL 2026');</code></p>
      )}
    </div>
  );
}
