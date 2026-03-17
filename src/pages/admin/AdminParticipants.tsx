import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isAdminAuthenticated, adminApi } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import type { Participant, Season } from '../../types';

export function AdminParticipants() {
  const [auth, setAuth] = useState<boolean | null>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeason, setSelectedSeason] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', nickname: '', dream11_team_name: '', payment_zelle: '', payment_cashapp: '', payment_venmo: '', buy_in_amount: '' });
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
        .then(({ data }) => {
          setSeasons(data || []);
          if (data?.length && !selectedSeason) setSelectedSeason(data[0].id);
        });
    }
  }, [auth]);

  useEffect(() => {
    if (supabase && selectedSeason) {
      supabase.from('participants').select('*').eq('season_id', selectedSeason).order('sort_order')
        .then(({ data }) => setParticipants(data || []));
    }
  }, [selectedSeason]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminApi.createParticipant(selectedSeason, {
        ...form,
        buy_in_amount: form.buy_in_amount ? parseFloat(form.buy_in_amount) : null,
      });
      setShowForm(false);
      setForm({ name: '', nickname: '', dream11_team_name: '', payment_zelle: '', payment_cashapp: '', payment_venmo: '', buy_in_amount: '' });
      if (supabase) {
        const { data } = await supabase.from('participants').select('*').eq('season_id', selectedSeason).order('sort_order');
        setParticipants(data || []);
      }
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this participant?')) return;
    try {
      await adminApi.deleteParticipant(id);
      setParticipants((p) => p.filter((x) => x.id !== id));
    } catch (err) {
      alert((err as Error).message);
    }
  };

  if (auth === null) return <div className="loading">Loading...</div>;
  if (!auth) return null;

  return (
    <div className="page admin-participants">
      <div className="admin-header">
        <Link to="/admin">← Admin</Link>
        <h1>Participants</h1>
      </div>
      <select value={selectedSeason} onChange={(e) => setSelectedSeason(e.target.value)}>
        {seasons.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
      <button onClick={() => setShowForm(true)}>Add Participant</button>

      {showForm && (
        <form onSubmit={handleSubmit} className="participant-form">
          <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input placeholder="Nickname" value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} />
          <input placeholder="Dream11 Team" value={form.dream11_team_name} onChange={(e) => setForm({ ...form, dream11_team_name: e.target.value })} />
          <input placeholder="Buy-in $" value={form.buy_in_amount} onChange={(e) => setForm({ ...form, buy_in_amount: e.target.value })} type="number" step="0.01" />
          <button type="submit">Save</button>
          <button type="button" onClick={() => setShowForm(false)}>Cancel</button>
        </form>
      )}

      <div className="participant-list">
        {participants.map((p) => (
          <div key={p.id} className="participant-card">
            <span>{p.name} ({p.nickname || '-'}) - {p.dream11_team_name || '-'}</span>
            <button onClick={() => handleDelete(p.id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}
