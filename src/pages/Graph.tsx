import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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

  const colors = [
    { stroke: '#22c55e', fill: 'rgba(34, 197, 94, 0.15)' },
    { stroke: '#3b82f6', fill: 'rgba(59, 130, 246, 0.15)' },
    { stroke: '#f59e0b', fill: 'rgba(245, 158, 11, 0.15)' },
    { stroke: '#ef4444', fill: 'rgba(239, 68, 68, 0.15)' },
    { stroke: '#8b5cf6', fill: 'rgba(139, 92, 246, 0.15)' },
    { stroke: '#ec4899', fill: 'rgba(236, 72, 153, 0.15)' },
    { stroke: '#06b6d4', fill: 'rgba(6, 182, 212, 0.15)' },
    { stroke: '#84cc16', fill: 'rgba(132, 204, 22, 0.15)' },
    { stroke: '#f97316', fill: 'rgba(249, 115, 22, 0.15)' },
    { stroke: '#6366f1', fill: 'rgba(99, 102, 241, 0.15)' },
    { stroke: '#14b8a6', fill: 'rgba(20, 184, 166, 0.15)' },
    { stroke: '#a855f7', fill: 'rgba(168, 85, 247, 0.15)' },
  ];

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="chart-tooltip">
        <div className="chart-tooltip-label">{label}</div>
        {payload.map((p) => (
          <div key={p.name} style={{ color: p.color }}>
            {p.name}: <strong>${Number(p.value).toFixed(2)}</strong>
          </div>
        ))}
      </div>
    );
  };

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
          <ResponsiveContainer width="100%" height={420}>
            <AreaChart data={chartData}>
              <defs>
                {participants.map((p, i) => (
                  <linearGradient key={p.id} id={`gradient-${p.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={colors[i % colors.length].stroke} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={colors[i % colors.length].stroke} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(51, 65, 85, 0.6)" />
              <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '1rem' }} formatter={(value) => <span style={{ color: 'var(--text)' }}>{value}</span>} />
              {participants.map((p, i) => (
                <Area
                  key={p.id}
                  type="monotone"
                  dataKey={p.name}
                  stroke={colors[i % colors.length].stroke}
                  strokeWidth={2.5}
                  fill={`url(#gradient-${p.id})`}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
