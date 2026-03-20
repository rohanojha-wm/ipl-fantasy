import { useEffect, useState, useMemo } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from '../lib/supabase';
import { useSeasons } from '../lib/useSeasons';
import type { Participant } from '../types';

export function Graph() {
  const { seasons, loading, error } = useSeasons();
  const [selectedSeason, setSelectedSeason] = useState<string>('');
  const [chartData, setChartData] = useState<{ date: string; [key: string]: string | number }[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);

  useEffect(() => {
    if (seasons.length > 0 && !selectedSeason) setSelectedSeason(seasons[0].id);
  }, [seasons, selectedSeason]);

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

    const channel = supabase!.channel('graph-standings').on('postgres_changes', { event: '*', schema: 'public', table: 'standings' }, fetch).subscribe();
    return () => {
      supabase!.removeChannel(channel);
    };
  }, [selectedSeason]);

  const barData = useMemo(() => {
    if (chartData.length === 0) return [];
    const last = chartData.at(-1)!;
    return participants
      .map((p) => {
        const v = Number(last[p.name] ?? 0);
        return {
          name: p.nickname ? `${p.name} (${p.nickname})` : p.name,
          winnings: v,
          participantId: p.id,
        };
      })
      .sort((a, b) => b.winnings - a.winnings);
  }, [chartData, participants]);

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  const colors = [
    { stroke: '#e0a722', fill: 'rgba(224, 167, 34, 0.2)' },
    { stroke: '#60a5fa', fill: 'rgba(96, 165, 250, 0.15)' },
    { stroke: '#34d399', fill: 'rgba(52, 211, 153, 0.15)' },
    { stroke: '#f472b6', fill: 'rgba(244, 114, 182, 0.15)' },
    { stroke: '#a78bfa', fill: 'rgba(167, 139, 250, 0.15)' },
    { stroke: '#38bdf8', fill: 'rgba(56, 189, 248, 0.15)' },
    { stroke: '#fbbf24', fill: 'rgba(251, 191, 36, 0.15)' },
    { stroke: '#4ade80', fill: 'rgba(74, 222, 128, 0.15)' },
    { stroke: '#c084fc', fill: 'rgba(192, 132, 252, 0.15)' },
    { stroke: '#2dd4bf', fill: 'rgba(45, 212, 191, 0.15)' },
    { stroke: '#fb923c', fill: 'rgba(251, 146, 60, 0.15)' },
    { stroke: '#818cf8', fill: 'rgba(129, 140, 248, 0.15)' },
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

  const BAR_COLOR = '#e0a722';

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
          <>
            <div className="chart-section">
              <h2 className="chart-title">Winnings ($)</h2>
              <ResponsiveContainer width="100%" height={Math.max(320, barData.length * 36)}>
                <BarChart data={barData} layout="vertical" margin={{ top: 8, right: 60, left: 100, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(51, 65, 85, 0.6)" horizontal={false} />
                  <XAxis type="number" domain={[0, 'auto']} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                  <YAxis type="category" dataKey="name" width={95} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                  <Bar dataKey="winnings" fill={BAR_COLOR} radius={[0, 4, 4, 0]} label={{ position: 'right', fill: 'var(--text)', formatter: (v: unknown) => `$${Number(v).toFixed(2)}` }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-section">
              <h2 className="chart-title">Over Time</h2>
              <ResponsiveContainer width="100%" height={320}>
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
            </div>
          </>
        )}
      </div>
    </div>
  );
}
