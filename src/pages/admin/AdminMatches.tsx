import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isAdminAuthenticated, adminApi } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { useSeasons } from '../../lib/useSeasons';
import type { Match } from '../../types';

const MATCH_TYPES = ['round_robin', 'qualifier1', 'qualifier2', 'eliminator', 'final'] as const;
const IPL_TEAMS = ['KKR', 'RCB', 'SRH', 'RR', 'CSK', 'MI', 'DC', 'LSG', 'GT', 'PBKS'];

export function AdminMatches() {
  const [auth, setAuth] = useState<boolean | null>(null);
  const { seasons } = useSeasons();
  const [selectedSeason, setSelectedSeason] = useState('');
  const [matches, setMatches] = useState<Match[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [form, setForm] = useState({ match_date: '', match_time: '', team1: '', team2: '', venue: '', match_type: 'round_robin' });
  const navigate = useNavigate();

  useEffect(() => {
    isAdminAuthenticated().then((ok) => {
      setAuth(ok);
      if (!ok) navigate('/admin/login');
    });
  }, [navigate]);

  useEffect(() => {
    if (seasons.length > 0 && !selectedSeason) setSelectedSeason(seasons[0].id);
  }, [seasons, selectedSeason]);

  useEffect(() => {
    if (supabase && selectedSeason) {
      supabase.from('matches').select('*').eq('season_id', selectedSeason).order('match_date', { ascending: false })
        .then(({ data }) => setMatches(data || []));
    }
  }, [selectedSeason]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingMatch) {
        await adminApi.updateMatch(editingMatch.id, form);
      } else {
        await adminApi.createMatch(selectedSeason, form);
      }
      setShowForm(false);
      setEditingMatch(null);
      setForm({ match_date: '', match_time: '', team1: '', team2: '', venue: '', match_type: 'round_robin' });
      if (supabase) {
        const { data } = await supabase.from('matches').select('*').eq('season_id', selectedSeason).order('match_date', { ascending: false });
        setMatches(data || []);
      }
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this match?')) return;
    try {
      await adminApi.deleteMatch(id);
      setMatches((m) => m.filter((x) => x.id !== id));
    } catch (err) {
      alert((err as Error).message);
    }
  };

  if (auth === null) return <div className="loading">Loading...</div>;
  if (!auth) return null;

  return (
    <div className="page admin-matches">
      <div className="admin-header">
        <Link to="/admin">← Admin</Link>
        <h1>Matches</h1>
      </div>
      <select value={selectedSeason} onChange={(e) => setSelectedSeason(e.target.value)}>
        {seasons.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
      <button onClick={() => { setShowForm(true); setEditingMatch(null); setForm({ match_date: '', match_time: '', team1: '', team2: '', venue: '', match_type: 'round_robin' }); }}>Add Match</button>

      {showForm && (
        <form onSubmit={handleSubmit} className="match-form">
          <input placeholder="Date (YYYY-MM-DD)" value={form.match_date} onChange={(e) => setForm({ ...form, match_date: e.target.value })} required />
          <input placeholder="Time" value={form.match_time} onChange={(e) => setForm({ ...form, match_time: e.target.value })} />
          <select value={form.team1} onChange={(e) => setForm({ ...form, team1: e.target.value })} required>
            <option value="">Team 1</option>
            {IPL_TEAMS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={form.team2} onChange={(e) => setForm({ ...form, team2: e.target.value })} required>
            <option value="">Team 2</option>
            {IPL_TEAMS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input placeholder="Venue" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
          <select value={form.match_type} onChange={(e) => setForm({ ...form, match_type: e.target.value })}>
            {MATCH_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <button type="submit">Save</button>
          <button type="button" onClick={() => { setShowForm(false); setEditingMatch(null); }}>Cancel</button>
        </form>
      )}

      <div className="match-list">
        {matches.map((m) => (
          <div key={m.id} className="match-card">
            <span>{m.match_date} {m.team1} vs {m.team2} ({m.match_type})</span>
            <Link to={`/admin/matches/${m.id}`}>Edit Standings</Link>
            <button onClick={() => handleDelete(m.id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}
