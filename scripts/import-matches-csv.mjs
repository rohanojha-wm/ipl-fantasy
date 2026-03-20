#!/usr/bin/env node
/**
 * Import matches from CSV into Supabase
 *
 * Usage: node scripts/import-matches-csv.mjs <season-name> [path-to.csv]
 *   e.g. node scripts/import-matches-csv.mjs "IPL 2026" scripts/example-matches-2026.csv
 *
 * CSV columns (order matters): match_date, match_time, team1, team2, venue, match_type
 * - match_date: YYYY-MM-DD (required)
 * - match_time: optional (e.g. 19:30)
 * - team1, team2: team names (required)
 * - venue: optional
 * - match_type: round_robin | qualifier1 | qualifier2 | eliminator | final
 *
 * Requires: SUPABASE_SERVICE_ROLE_KEY and VITE_SUPABASE_URL (or SUPABASE_URL) in .env
 */

import 'dotenv/config';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(',').map((h) => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim());
    const row = {};
    headers.forEach((h, j) => {
      row[h] = values[j] ?? '';
    });
    rows.push(row);
  }
  return { headers, rows };
}

async function main() {
  const args = process.argv.slice(2);
  const seasonName = args[0] || 'IPL 2026';
  const csvPath = args[1] || resolve(__dirname, 'example-matches-2026.csv');

  console.log('Season:', seasonName);
  console.log('Reading:', csvPath);

  const text = readFileSync(csvPath, 'utf-8');
  const { headers, rows } = parseCSV(text);

  const required = ['match_date', 'team1', 'team2', 'match_type'];
  for (const col of required) {
    if (!headers.includes(col)) {
      console.error('CSV must have columns:', required.join(', '));
      console.error('Found:', headers.join(', '));
      process.exit(1);
    }
  }

  const matches = rows
    .filter((r) => r.match_date && r.team1 && r.team2 && r.match_type)
    .map((r) => ({
      match_date: r.match_date,
      match_time: r.match_time || null,
      team1: r.team1,
      team2: r.team2,
      venue: r.venue || null,
      match_type: r.match_type,
    }));

  const validTypes = ['round_robin', 'qualifier1', 'qualifier2', 'eliminator', 'final'];
  const invalid = matches.filter((m) => !validTypes.includes(m.match_type));
  if (invalid.length) {
    console.error('Invalid match_type. Must be one of:', validTypes.join(', '));
    invalid.forEach((m) => console.error('  ', m.match_date, m.team1, 'vs', m.team2, '->', m.match_type));
    process.exit(1);
  }

  console.log('Parsed', matches.length, 'matches');

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Add SUPABASE_SERVICE_ROLE_KEY and VITE_SUPABASE_URL (or SUPABASE_URL) to .env');
    process.exit(1);
  }

  const supabase = createClient(url, key);

  let seasonId;
  const { data: existing } = await supabase.from('seasons').select('id').eq('name', seasonName).single();
  if (existing) {
    seasonId = existing.id;
    console.log('Using existing season:', seasonName);
  } else {
    const { data: newSeason, error: seasonErr } = await supabase
      .from('seasons')
      .insert({ name: seasonName, start_date: matches[0]?.match_date, end_date: matches[matches.length - 1]?.match_date })
      .select('id')
      .single();
    if (seasonErr) {
      console.error('Failed to create season:', seasonErr.message);
      process.exit(1);
    }
    seasonId = newSeason.id;
    console.log('Created season:', seasonName);

    // Default payout config (same as IPL 2025)
    await supabase.from('payout_config').upsert(
      [
        { season_id: seasonId, phase: 'round_robin', position_1st: 5, position_2nd: 4, position_3rd: 3, position_4th: 2, position_5th: 1 },
        { season_id: seasonId, phase: 'knockout', position_1st: 23, position_2nd: 18, position_3rd: 13, position_4th: 7, position_5th: 5 },
        { season_id: seasonId, phase: 'final', position_1st: 24, position_2nd: 18, position_3rd: 14, position_4th: 10, position_5th: 6 },
      ],
      { onConflict: 'season_id,phase' }
    );
    console.log('Added default payout config');
  }

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const { error } = await supabase.from('matches').insert({
      season_id: seasonId,
      match_date: m.match_date,
      match_time: m.match_time,
      team1: m.team1,
      team2: m.team2,
      venue: m.venue,
      match_type: m.match_type,
    });
    if (error) {
      console.warn('Match', m.match_date, m.team1, 'vs', m.team2, ':', error.message);
    } else if ((i + 1) % 10 === 0 || i === 0) {
      process.stdout.write(`  Inserted ${i + 1}/${matches.length}...\r`);
    }
  }

  console.log('\nImport complete! Add participants in Admin → Participants, then edit standings per match.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
