import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isAdminAuthenticated, adminLogout } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import type { Season } from '../../types';

export function AdminDashboard() {
  const [auth, setAuth] = useState<boolean | null>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    isAdminAuthenticated().then((ok) => {
      setAuth(ok);
      if (!ok) navigate('/admin/login');
    });
  }, [navigate]);

  useEffect(() => {
    if (supabase && auth) {
      supabase.from('seasons').select('*').order('created_at', { ascending: false })
        .then(({ data }) => setSeasons(data || []));
    }
  }, [auth]);

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
