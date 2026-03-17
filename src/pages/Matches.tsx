import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Match, Participant, Season, Standing } from '../types';

interface StandingWithParticipant extends Standing {
  participant: Participant;
}

interface MatchWithStandings extends Match {
  standings: StandingWithParticipant[];
}

export function Matches() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<string>('');
  const [matches, setMatches] = useState<MatchWithStandings[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setError('Supabase not configured.');
      setLoading(false);
      return;
    }
    void (async () => {
      try {
        const { data, error: e } = await supabase.from('seasons').select('*').order('created_at', { ascending: false });
        if (e) throw e;
        setSeasons(data || []);
        if (data?.length && !selectedSeason) setSelectedSeason(data[0].id);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!supabase || !selectedSeason) return;

    const fetch = async () => {
      const { data: matchList } = await supabase!.from('matches').select('*').eq('season_id', selectedSeason).order('match_date', { ascending: false });
      if (!matchList?.length) {
        setMatches([]);
        return;
      }

      const { data: participants } = await supabase!.from('participants').select('*').eq('season_id', selectedSeason);
      const participantMap = Object.fromEntries((participants || []).map((p) => [p.id, p]));

      const { data: st } = await supabase!.from('standings').select('*').in('match_id', matchList.map((m) => m.id));
      const byMatch: Record<string, StandingWithParticipant[]> = {};
      for (const s of st || []) {
        if (!byMatch[s.match_id]) byMatch[s.match_id] = [];
        byMatch[s.match_id].push({
          ...s,
          participant: participantMap[s.participant_id] || { name: '?', nickname: null } as Participant,
        });
      }

      const result: MatchWithStandings[] = matchList.map((m) => {
        const st = (byMatch[m.id] || []).sort((a, b) => a.position - b.position);
        return { ...m, standings: st };
      });

      setMatches(result);
    };

    fetch();
  }, [selectedSeason]);

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="page matches">
      <h1>Match History</h1>
      {seasons.length > 1 && (
        <select value={selectedSeason} onChange={(e) => setSelectedSeason(e.target.value)} className="season-select">
          {seasons.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      )}
      <div className="match-list">
        {matches.map((m) => (
          <div key={m.id} className="match-card">
            <div className="match-header">
              <span className="match-date">{m.match_date}</span>
              <span className="match-teams">{m.team1} vs {m.team2}</span>
              {m.venue && <span className="match-venue">{m.venue}</span>}
              <span className="match-type">{m.match_type}</span>
            </div>
            <div className="match-standings">
              {m.standings.length === 0 ? (
                <span className="no-standings">No standings yet</span>
              ) : (
                m.standings.map((s, i) => (
                  <span key={s.id} className="standing">
                    {i > 0 && ' → '}
                    {s.participant.name} (${Number(s.dollars_earned || 0).toFixed(2)})
                  </span>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
      {matches.length === 0 && <p className="empty">No matches yet.</p>}
    </div>
  );
}
