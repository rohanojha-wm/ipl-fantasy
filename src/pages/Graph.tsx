import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from '../lib/supabase';
import type { Participant, Season } from '../types';

export function Graph() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<string>('');
  const [chartData, setChartData] = useState<{ date: string; [key: string]: string | number }[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
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
      const { data: parts } = await supabase!.from('participants').select('*').eq('season_id', selectedSeason).eq('is_active', true).order('sort_order');
      setParticipants(parts || []);

      const { data: matches } = await supabase!.from('matches').select('id, match_date').eq('season_id', selectedSeason).order('match_date', { ascending: true });
      if (!matches?.length) {
        setChartData([]);
        return;
      }

      const { data: st } = await supabase!.from('standings').select('match_id, participant_id, dollars_earned').in('match_id', matches.map((m) => m.id));

      const cumulative: Record<string, number> = {};
      for (const p of parts || []) cumulative[p.id] = 0;

      const result: { date: string; [key: string]: string | number }[] = [];

      for (const m of matches) {
        const matchStandings = (st || []).filter((s) => s.match_id === m.id);
        for (const s of matchStandings) {
          cumulative[s.participant_id] = (cumulative[s.participant_id] || 0) + Number(s.dollars_earned || 0);
        }
        const row: { date: string; [key: string]: string | number } = { date: m.match_date };
        for (const p of parts || []) {
          row[p.name] = cumulative[p.id] ?? 0;
        }
        result.push(row);
      }

      setChartData(result);
    };

    fetch();
  }, [selectedSeason]);

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1', '#14b8a6', '#a855f7'];

  return (
    <div className="page graph">
      <h1>Cumulative Winnings</h1>
      {seasons.length > 1 && (
        <select value={selectedSeason} onChange={(e) => setSelectedSeason(e.target.value)} className="season-select">
          {seasons.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      )}
      <div className="chart-container">
        {chartData.length === 0 ? (
          <p className="empty">No data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              {participants.map((p, i) => (
                <Line key={p.id} type="monotone" dataKey={p.name} stroke={colors[i % colors.length]} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
