import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useSeasons } from '../lib/useSeasons';
import type { Participant } from '../types';

interface Balance {
  participant: Participant;
  total_won: number;
  buy_in: number;
  net: number;
}

export function Ledger() {
  const { seasons, loading, error } = useSeasons();
  const [selectedSeason, setSelectedSeason] = useState<string>('');
  const [balances, setBalances] = useState<Balance[]>([]);

  useEffect(() => {
    if (seasons.length > 0 && !selectedSeason) setSelectedSeason(seasons[0].id);
  }, [seasons, selectedSeason]);

  useEffect(() => {
    if (!supabase || !selectedSeason) return;

    const fetch = async () => {
      const { data: participants } = await supabase!.from('participants').select('*').eq('season_id', selectedSeason).eq('is_active', true).order('sort_order');
      if (!participants?.length) {
        setBalances([]);
        return;
      }

      const { data: matches } = await supabase!.from('matches').select('id').eq('season_id', selectedSeason);
      const matchIds = matches?.map((m) => m.id) || [];

      const { data: st } = matchIds.length > 0
        ? await supabase!.from('standings').select('participant_id, dollars_earned').in('match_id', matchIds)
        : { data: [] };

      const won: Record<string, number> = {};
      for (const p of participants) won[p.id] = 0;
      for (const s of st || []) {
        if (won[s.participant_id] !== undefined) won[s.participant_id] += Number(s.dollars_earned || 0);
      }

      const result: Balance[] = participants.map((p) => ({
        participant: p,
        total_won: won[p.id] ?? 0,
        buy_in: Number(p.buy_in_amount || 0),
        net: (won[p.id] ?? 0) - Number(p.buy_in_amount || 0),
      }));

      setBalances(result.sort((a, b) => b.net - a.net));
    };

    fetch();
  }, [selectedSeason]);

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  const totalBuyIn = balances.reduce((s, b) => s + b.buy_in, 0);
  const totalWon = balances.reduce((s, b) => s + b.total_won, 0);

  return (
    <div className="page ledger">
      <h1>Payout Ledger</h1>
      {seasons.length > 1 && (
        <select value={selectedSeason} onChange={(e) => setSelectedSeason(e.target.value)} className="season-select">
          {seasons.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      )}
      <div className="ledger-summary">
        <p>Total buy-in: ${totalBuyIn.toFixed(2)} | Total distributed: ${totalWon.toFixed(2)}</p>
      </div>
      <div className="ledger-table">
        <table>
          <thead>
            <tr>
              <th>Player</th>
              <th>Total Won</th>
              <th>Buy-in</th>
              <th>Net</th>
            </tr>
          </thead>
          <tbody>
            {balances.map((b) => (
              <tr key={b.participant.id} className={b.net >= 0 ? 'positive' : 'negative'}>
                <td>{b.participant.name}</td>
                <td>${b.total_won.toFixed(2)}</td>
                <td>${b.buy_in.toFixed(2)}</td>
                <td>${b.net.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {balances.length === 0 && <p className="empty">No data yet.</p>}
    </div>
  );
}
