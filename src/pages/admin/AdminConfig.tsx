import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isAdminAuthenticated, adminApi } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { useSeasons } from '../../lib/useSeasons';
import type { PayoutConfig } from '../../types';

export function AdminConfig() {
  const [auth, setAuth] = useState<boolean | null>(null);
  const { seasons } = useSeasons();
  const [selectedSeason, setSelectedSeason] = useState('');
  const [, setConfigs] = useState<PayoutConfig[]>([]);
  const [form, setForm] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
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
      supabase.from('payout_config').select('*').eq('season_id', selectedSeason)
        .then(({ data }) => {
          setConfigs(data || []);
          const f: Record<string, number> = {};
          for (const c of data || []) {
            f[`${c.phase}_1st`] = c.position_1st;
            f[`${c.phase}_2nd`] = c.position_2nd;
            f[`${c.phase}_3rd`] = c.position_3rd;
            f[`${c.phase}_4th`] = c.position_4th;
            f[`${c.phase}_5th`] = c.position_5th;
          }
          setForm(f);
        });
    }
  }, [selectedSeason]);

  const handleSave = async (phase: string) => {
    setSaving(true);
    try {
      await adminApi.updatePayoutConfig(selectedSeason, phase, {
        position_1st: form[`${phase}_1st`] ?? 0,
        position_2nd: form[`${phase}_2nd`] ?? 0,
        position_3rd: form[`${phase}_3rd`] ?? 0,
        position_4th: form[`${phase}_4th`] ?? 0,
        position_5th: form[`${phase}_5th`] ?? 0,
      });
      if (supabase) {
        const { data } = await supabase.from('payout_config').select('*').eq('season_id', selectedSeason);
        setConfigs(data || []);
      }
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (auth === null) return <div className="loading">Loading...</div>;
  if (!auth) return null;

  const phases = ['round_robin', 'knockout', 'final'];

  return (
    <div className="page admin-config">
      <div className="admin-header">
        <Link to="/admin">← Admin</Link>
        <h1>Payout Config</h1>
      </div>
      <select value={selectedSeason} onChange={(e) => setSelectedSeason(e.target.value)}>
        {seasons.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
      <div className="config-sections">
        {phases.map((phase) => (
          <div key={phase} className="config-section">
            <h3>{phase.replace('_', ' ')}</h3>
            <div className="config-row">
              {[1, 2, 3, 4, 5].map((pos) => (
                <label key={pos}>
                  {pos}.
                  <input
                    type="number"
                    step="0.01"
                    value={form[`${phase}_${pos === 1 ? '1st' : pos === 2 ? '2nd' : pos === 3 ? '3rd' : pos === 4 ? '4th' : '5th'}`] ?? ''}
                    onChange={(e) => setForm({ ...form, [`${phase}_${pos === 1 ? '1st' : pos === 2 ? '2nd' : pos === 3 ? '3rd' : pos === 4 ? '4th' : '5th'}`]: parseFloat(e.target.value) || 0 })}
                  />
                </label>
              ))}
            </div>
            <button onClick={() => handleSave(phase)} disabled={saving}>Save {phase}</button>
          </div>
        ))}
      </div>
    </div>
  );
}
