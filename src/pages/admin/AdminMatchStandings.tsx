import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { isAdminAuthenticated, adminApi } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import type { Match, Participant } from '../../types';

export function AdminMatchStandings() {
  const { id } = useParams();
  const [auth, setAuth] = useState<boolean | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [standings, setStandings] = useState<{ position: number; participant_ids: string[] }[]>([
    { position: 1, participant_ids: [] },
    { position: 2, participant_ids: [] },
    { position: 3, participant_ids: [] },
    { position: 4, participant_ids: [] },
    { position: 5, participant_ids: [] },
  ]);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    isAdminAuthenticated().then((ok) => {
      setAuth(ok);
      if (!ok) navigate('/admin/login');
    });
  }, [navigate]);

  useEffect(() => {
    if (!supabase || !id || !auth) return;
    supabase.from('matches').select('*').eq('id', id).single()
      .then(({ data, error }) => {
        if (error || !data) navigate('/admin/matches');
        else {
          setMatch(data);
          supabase!.from('participants').select('*').eq('season_id', data.season_id).eq('is_active', true).order('sort_order')
            .then(({ data: p }) => setParticipants(p || []));
        }
      });
  }, [id, auth]);

  useEffect(() => {
    if (!supabase || !id) return;
    supabase!.from('standings').select('*').eq('match_id', id).then(({ data }) => {
      if (data?.length) {
        const byPos: Record<number, string[]> = {};
        for (const s of data) {
          if (!byPos[s.position]) byPos[s.position] = [];
          byPos[s.position].push(s.participant_id);
        }
        setStandings([1, 2, 3, 4, 5].map((p) => ({ position: p, participant_ids: byPos[p] || [] })));
      }
    });
  }, [id]);

  const setParticipantForPosition = (pos: number, participantIds: string[]) => {
    setStandings((prev) =>
      prev.map((s) => (s.position === pos ? { ...s, participant_ids: participantIds } : s))
    );
  };

  const addParticipantToPosition = (pos: number, participantId: string) => {
    const row = standings.find((s) => s.position === pos)!;
    if (participantId && !row.participant_ids.includes(participantId)) {
      setParticipantForPosition(pos, [...row.participant_ids, participantId]);
    }
  };

  const removeParticipantFromPosition = (pos: number, idx: number) => {
    const row = standings.find((s) => s.position === pos)!;
    setParticipantForPosition(pos, row.participant_ids.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const payload = standings.map((s) => ({
        position: s.position,
        participant_ids: s.participant_ids.filter(Boolean),
      })).filter((s) => s.participant_ids.length > 0);
      await adminApi.setStandings(id, payload);
      navigate('/admin/matches');
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (auth === null) return <div className="loading">Loading...</div>;
  if (!auth) return null;

  return (
    <div className="page admin-standings">
      <Link to="/admin/matches">← Back</Link>
      <h1>Standings: {match?.team1} vs {match?.team2} ({match?.match_date})</h1>
      <div className="standings-editor">
        {[1, 2, 3, 4, 5].map((pos) => {
          const row = standings.find((s) => s.position === pos)!;
          return (
            <div key={pos} className="position-row">
              <label>{pos}. </label>
              {row.participant_ids.map((pid, idx) => (
                <span key={idx} className="participant-chip">
                  {participants.find((p) => p.id === pid)?.name || '?'}
                  <button type="button" onClick={() => removeParticipantFromPosition(pos, idx)}>×</button>
                </span>
              ))}
              <select
                value=""
                onChange={(e) => { addParticipantToPosition(pos, e.target.value); e.target.value = ''; }}
              >
                <option value="">Add...</option>
                {participants.filter((p) => !row.participant_ids.includes(p.id)).map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
      <button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Standings'}</button>
    </div>
  );
}
