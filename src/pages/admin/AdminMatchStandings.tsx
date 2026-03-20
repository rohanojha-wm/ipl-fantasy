import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { isAdminAuthenticated, adminApi } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import type { Match, Participant, PayoutConfig } from '../../types';

const MATCH_TYPE_TO_PHASE: Record<string, string> = {
  round_robin: 'round_robin',
  qualifier1: 'knockout',
  qualifier2: 'knockout',
  eliminator: 'knockout',
  final: 'final',
};

const PHASE_POSITION_KEYS = ['position_1st', 'position_2nd', 'position_3rd', 'position_4th', 'position_5th'];

function computeDefaultAmounts(
  standings: { position: number; participant_ids: string[] }[],
  config: PayoutConfig
): Record<string, number> {
  const amounts: Record<string, number> = {};
  const cfg = config as Record<string, number>;
  let nextSlotStart = 1;

  const sorted = [...standings].sort((a, b) => a.position - b.position);
  for (const s of sorted) {
    const count = s.participant_ids.length;
    if (count === 0) continue;

    let pool = 0;
    for (let i = 0; i < count && nextSlotStart + i <= 5; i++) {
      pool += cfg[PHASE_POSITION_KEYS[nextSlotStart + i - 1]] || 0;
    }
    const each = count > 0 ? pool / count : 0;

    for (const pid of s.participant_ids) {
      amounts[pid] = each;
    }
    nextSlotStart += count;
  }
  return amounts;
}

export function AdminMatchStandings() {
  const { id } = useParams();
  const [auth, setAuth] = useState<boolean | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [payoutConfig, setPayoutConfig] = useState<PayoutConfig | null>(null);
  const [standings, setStandings] = useState<{ position: number; participant_ids: string[] }[]>([
    { position: 1, participant_ids: [] },
    { position: 2, participant_ids: [] },
    { position: 3, participant_ids: [] },
    { position: 4, participant_ids: [] },
    { position: 5, participant_ids: [] },
  ]);
  const [amountOverrides, setAmountOverrides] = useState<Record<string, number>>({});
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
          const phase = MATCH_TYPE_TO_PHASE[data.match_type] || 'round_robin';
          supabase!.from('payout_config').select('*').eq('season_id', data.season_id).eq('phase', phase).single()
            .then(({ data: cfg }) => setPayoutConfig(cfg || null));
        }
      });
  }, [id, auth]);

  useEffect(() => {
    if (!supabase || !id) return;
    supabase!.from('standings').select('*').eq('match_id', id).then(({ data }) => {
      if (data?.length) {
        const byPos: Record<number, string[]> = {};
        const overrides: Record<string, number> = {};
        for (const s of data) {
          if (!byPos[s.position]) byPos[s.position] = [];
          byPos[s.position].push(s.participant_id);
          if (s.dollars_earned != null) {
            overrides[s.participant_id] = Number(s.dollars_earned);
          }
        }
        setStandings([1, 2, 3, 4, 5].map((p) => ({ position: p, participant_ids: byPos[p] || [] })));
        setAmountOverrides(overrides);
      }
    });
  }, [id]);

  const defaultAmounts = useMemo(() => {
    if (!payoutConfig) return {};
    return computeDefaultAmounts(standings, payoutConfig);
  }, [standings, payoutConfig]);

  const getAmountForParticipant = (pid: string): number => {
    if (amountOverrides[pid] !== undefined) return amountOverrides[pid];
    return defaultAmounts[pid] ?? 0;
  };

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
    const pid = row.participant_ids[idx];
    setParticipantForPosition(pos, row.participant_ids.filter((_, i) => i !== idx));
    if (pid) {
      setAmountOverrides((prev) => {
        const next = { ...prev };
        delete next[pid];
        return next;
      });
    }
  };

  const setAmountOverride = (pid: string, value: number | '') => {
    if (value === '') {
      setAmountOverrides((prev) => {
        const next = { ...prev };
        delete next[pid];
        return next;
      });
    } else {
      setAmountOverrides((prev) => ({ ...prev, [pid]: value }));
    }
  };

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const payload = standings
        .filter((s) => s.participant_ids.length > 0)
        .map((s) => {
          const amounts: Record<string, number> = {};
          for (const pid of s.participant_ids) {
            amounts[pid] = getAmountForParticipant(pid);
          }
          return {
            position: s.position,
            participant_ids: s.participant_ids.filter(Boolean),
            amounts,
          };
        });
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
            <div key={pos} className="position-row position-row-with-amounts">
              <label>{pos}. </label>
              <div className="position-participants">
                {row.participant_ids.map((pid, idx) => {
                  const amt = getAmountForParticipant(pid);
                  const isOverride = amountOverrides[pid] !== undefined;
                  return (
                    <div key={idx} className="participant-with-amount">
                      <span className="participant-chip">
                        {participants.find((p) => p.id === pid)?.name || '?'}
                        <button type="button" onClick={() => removeParticipantFromPosition(pos, idx)}>×</button>
                      </span>
                      <span className="amount-display">
                        $
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className={`amount-input ${isOverride ? 'override' : ''}`}
                          value={amt}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === '') setAmountOverride(pid, '');
                            else {
                              const n = parseFloat(v);
                              if (!isNaN(n) && n >= 0) setAmountOverride(pid, n);
                            }
                          }}
                          placeholder={defaultAmounts[pid]?.toFixed(2) || '0'}
                          title={isOverride ? 'Override (clear to use default)' : 'Editable - change to override'}
                        />
                      </span>
                    </div>
                  );
                })}
              </div>
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
      <p className="standings-hint">Amounts are computed from payout config. Override by editing the $ value.</p>
      <button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Standings'}</button>
    </div>
  );
}
