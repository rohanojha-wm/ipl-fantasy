import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useSeasons } from '../lib/useSeasons';
import type { Participant } from '../types';

interface LeaderboardRow {
  participant: Participant;
  total_winnings: number;
  matches_won: number;
}

export function Home() {
  const { seasons, loading, error } = useSeasons();
  const [selectedSeason, setSelectedSeason] = useState<string>('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);

  useEffect(() => {
    if (seasons.length > 0 && !selectedSeason) setSelectedSeason(seasons[0].id);
  }, [seasons, selectedSeason]);

  useEffect(() => {
    if (!supabase || !selectedSeason) return;

    const fetchLeaderboard = async () => {
      const { data: participants } = await supabase!.from('participants').select('*').eq('season_id', selectedSeason).eq('is_active', true).order('sort_order');
      if (!participants?.length) {
        setLeaderboard([]);
        return;
      }

      const { data: matches } = await supabase!.from('matches').select('id').eq('season_id', selectedSeason);
      const matchIdList = matches?.map((m) => m.id) || [];

      const byParticipant: Record<string, { total: number; matches: Set<string> }> = {};
      for (const p of participants) {
        byParticipant[p.id] = { total: 0, matches: new Set() };
      }

      if (matchIdList.length > 0) {
        const { data: st } = await supabase!.from('standings').select('participant_id, dollars_earned, match_id').in('match_id', matchIdList);
        for (const s of st || []) {
          if (byParticipant[s.participant_id]) {
            byParticipant[s.participant_id].total += Number(s.dollars_earned || 0);
            byParticipant[s.participant_id].matches.add(s.match_id);
          }
        }
      }

      const rows: LeaderboardRow[] = participants.map((p) => ({
        participant: p,
        total_winnings: byParticipant[p.id]?.total ?? 0,
        matches_won: byParticipant[p.id]?.matches.size ?? 0,
      }));

      rows.sort((a, b) => b.total_winnings - a.total_winnings);
      setLeaderboard(rows);
    };

    fetchLeaderboard();

    const channel = supabase!.channel('home-standings').on('postgres_changes', { event: '*', schema: 'public', table: 'standings' }, fetchLeaderboard).subscribe();
    return () => {
      supabase!.removeChannel(channel);
    };
  }, [selectedSeason]);

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="page home">
      <h1>Leaderboard</h1>
      {seasons.length > 1 && (
        <select value={selectedSeason} onChange={(e) => setSelectedSeason(e.target.value)} className="season-select">
          {seasons.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      )}
      <div className="leaderboard-table">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Player</th>
              <th>Total Winnings ($)</th>
              <th>Matches Won</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((row, i) => (
              <tr key={row.participant.id}>
                <td className={`rank-cell rank-${i < 3 ? i + 1 : ''}`}>
                  {i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}
                </td>
                <td>{row.participant.name}{row.participant.nickname ? ` (${row.participant.nickname})` : ''}</td>
                <td className="winnings-cell">${row.total_winnings.toFixed(2)}</td>
                <td>{row.matches_won}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {leaderboard.length === 0 && <p className="empty">No data yet. Add matches and standings in Admin.</p>}
    </div>
  );
}
