#!/usr/bin/env node
/**
 * Import IPL 2025 data from IPL25.xlsx into Supabase
 * 
 * Usage: node scripts/import-ipl25.mjs [path-to-ipl25.xlsx]
 *        npm run import:ipl25 -- --replace  (to clear and re-import)
 * 
 * Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env or environment
 */

import 'dotenv/config';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Name variations in sheet -> canonical name
const NAME_MAP = {
  'Biswajit': 'Biswajit', 'Biswa': 'Biswajit',
  'Ravi A': 'Ravi A', 'Ravi': 'Ravi A',
  'Ravi P': 'Ravi P', 'Ravi Prasad': 'Ravi P',
  'HImanshu': 'Himanshu', 'NIlesh': 'Nilesh',
};

const DREAM11_MAP = {
  'Himanshu': 'HKALVA11', 'Biswajit': 'dasbiswajit', 'Milind': 'DRPRA906ST',
  'Gnanesh': 'Hyderabadi Hawa', 'Subba': 'Koneti Super 11', 'Ravi': 'ScaviXI',
  'Nilesh': 'Nilesh9391FG', 'Umesh': 'Rebel Assassin', 'Ravi A': 'ScavengerX1',
  'Ravi P': 'Hitcheeku', 'Sanjay': 'Sanjay Strikers', 'Rohan': 'RonsXI11',
  'Surya': 'Smash HitXI',
};

const TEAM_ALIAS = { 'PKBS': 'PBKS' };

function normalizeName(s) {
  const trimmed = String(s || '').trim();
  return NAME_MAP[trimmed] || trimmed;
}

function parseStandings(str) {
  if (!str || typeof str !== 'string') return [];
  // Format: "Biswajit > Subba > Umesh > Milind > Himanshu" or "Gnanesh/Nilesh" for ties
  const parts = str.split('>').map((p) => p.trim());
  const result = [];
  for (let pos = 1; pos <= 5; pos++) {
    const p = parts[pos - 1];
    if (!p) continue;
    const names = p.split('/').map((n) => normalizeName(n.trim())).filter(Boolean);
    result.push({ position: pos, names });
  }
  return result;
}

function parseDate(s) {
  if (!s) return null;
  const str = String(s);
  const m = str.match(/(\w+)\s+(\d+)/);
  if (!m) return str;
  const months = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
  const month = months[m[1].slice(0, 3)];
  const day = parseInt(m[2], 10);
  if (month && day) return `2025-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return str;
}

function getMatchType(rowIndex, totalRows) {
  if (rowIndex >= totalRows - 4) return 'final';
  if (rowIndex >= totalRows - 7) return 'eliminator';
  if (rowIndex >= totalRows - 10) return 'qualifier2';
  if (rowIndex >= totalRows - 11) return 'qualifier1';
  return 'round_robin';
}

async function main() {
  const xlsxPath = process.argv[2] || resolve(__dirname, '../../IPL25.xlsx');
  console.log('Reading:', xlsxPath);

  const buf = readFileSync(xlsxPath);
  const wb = XLSX.read(buf, { type: 'buffer' });
  const sheetName = wb.SheetNames.find((n) => n.toLowerCase().includes('detail')) || wb.SheetNames[1] || wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  const headers = rows[0] || [];
  const dateCol = headers.findIndex((h) => String(h).toLowerCase().includes('date'));
  const team1Col = headers.findIndex((h) => String(h).toLowerCase().includes('team') && String(h).includes('1'));
  const team2Col = headers.findIndex((h) => String(h).toLowerCase().includes('team') && String(h).includes('2'));
  const venueCol = headers.findIndex((h) => String(h).toLowerCase().includes('venue'));
  const standingsCol = headers.findIndex((h) => String(h).toLowerCase().includes('standing'));

  if (dateCol < 0 || standingsCol < 0) {
    console.log('Headers:', headers);
    console.error('Could not find Date or Standings column. Trying alternate parsing...');
  }

  const matches = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const dateVal = row[dateCol ?? 0];
    const standingsVal = row[standingsCol ?? 5];
    if (!standingsVal || String(standingsVal).length < 5) continue;

    const team1 = TEAM_ALIAS[String(row[team1Col ?? 2] || '').trim()] || String(row[team1Col ?? 2] || '').trim();
    const team2 = TEAM_ALIAS[String(row[team2Col ?? 3] || '').trim()] || String(row[team2Col ?? 3] || '').trim();
    if (!team1 || !team2) continue;

    const standings = parseStandings(standingsVal);
    if (standings.length === 0) continue;

    matches.push({
      match_date: parseDate(dateVal) || `2025-03-22`,
      team1,
      team2,
      venue: String(row[venueCol ?? 4] || '').trim() || null,
      match_type: getMatchType(i, rows.length),
      standings,
    });
  }

  console.log('Parsed', matches.length, 'matches');

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Add SUPABASE_SERVICE_ROLE_KEY to .env (get it from Supabase Dashboard → Settings → API → service_role key)');
    console.error('SUPABASE_URL is optional if VITE_SUPABASE_URL is set.');
    process.exit(1);
  }

  const supabase = createClient(url, key);

  let seasonId;
  const { data: newSeason, error: seasonErr } = await supabase
    .from('seasons')
    .insert({ name: 'IPL 2025', start_date: '2025-03-22', end_date: '2025-06-03' })
    .select('id')
    .single();

  if (seasonErr) {
    const { data: existing } = await supabase.from('seasons').select('id').eq('name', 'IPL 2025').single();
    if (existing) {
      console.log('Season IPL 2025 already exists, using it');
      seasonId = existing.id;
    } else {
      console.error('Season error:', seasonErr);
      process.exit(1);
    }
  } else {
    seasonId = newSeason.id;
  }
  if (!seasonId) {
    console.error('No season ID');
    process.exit(1);
  }

  const replace = process.argv.includes('--replace');
  if (replace) {
    console.log('Clearing existing IPL 2025 data...');
    const { data: existingMatches } = await supabase.from('matches').select('id').eq('season_id', seasonId);
    if (existingMatches?.length) {
      await supabase.from('standings').delete().in('match_id', existingMatches.map((m) => m.id));
    }
    await supabase.from('matches').delete().eq('season_id', seasonId);
    await supabase.from('participants').delete().eq('season_id', seasonId);
  }

  const allNames = new Set();
  for (const m of matches) {
    for (const s of m.standings) {
      for (const n of s.names) allNames.add(n);
    }
  }

  const participants = [];
  const nicknames = { Himanshu: 'HK', 'Ravi A': 'RA', Subba: 'SK', Gnanesh: 'GN', Milind: 'MJ', Umesh: 'UP', Nilesh: 'NV', Surya: 'SM', 'Ravi P': 'RP', Sanjay: 'SB', Biswajit: 'BD', Rohan: 'RO' };
  let sortOrder = 0;
  for (const name of ['Himanshu', 'Ravi A', 'Subba', 'Gnanesh', 'Milind', 'Umesh', 'Nilesh', 'Surya', 'Ravi P', 'Sanjay', 'Biswajit', 'Rohan']) {
    if (allNames.has(name) || participants.length < 12) {
      participants.push({
        season_id: seasonId,
        name,
        nickname: nicknames[name] || null,
        dream11_team_name: DREAM11_MAP[name] || null,
        is_active: true,
        sort_order: ++sortOrder,
      });
    }
  }

  for (const p of participants) {
    const { error: partErr } = await supabase.from('participants').insert(p);
    if (partErr && !partErr.message.includes('duplicate')) console.warn('Participant', p.name, ':', partErr.message);
  }

  const { data: partList } = await supabase.from('participants').select('id, name').eq('season_id', seasonId);
  const nameToId = Object.fromEntries((partList || []).map((p) => [p.name, p.id]));

  await supabase.from('payout_config').upsert([
    { season_id: seasonId, phase: 'round_robin', position_1st: 5, position_2nd: 4, position_3rd: 3, position_4th: 2, position_5th: 1 },
    { season_id: seasonId, phase: 'knockout', position_1st: 23, position_2nd: 18, position_3rd: 13, position_4th: 7, position_5th: 5 },
    { season_id: seasonId, phase: 'final', position_1st: 24, position_2nd: 18, position_3rd: 14, position_4th: 10, position_5th: 6 },
  ], { onConflict: 'season_id,phase' });

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    if ((i + 1) % 10 === 0 || i === 0) process.stdout.write(`  Match ${i + 1}/${matches.length}...\r`);
    const { data: match, error: matchErr } = await supabase
      .from('matches')
      .insert({ season_id: seasonId, match_date: m.match_date, team1: m.team1, team2: m.team2, venue: m.venue, match_type: m.match_type })
      .select('id')
      .single();

    if (matchErr) {
      console.warn('Match', m.match_date, m.team1, 'vs', m.team2, ':', matchErr.message);
      continue;
    }

    const phase = m.match_type === 'final' ? 'final' : ['qualifier1', 'qualifier2', 'eliminator'].includes(m.match_type) ? 'knockout' : 'round_robin';
    const { data: config } = await supabase.from('payout_config').select('*').eq('season_id', seasonId).eq('phase', phase).single();
    const posAmt = config ? [config.position_1st, config.position_2nd, config.position_3rd, config.position_4th, config.position_5th] : [5, 4, 3, 2, 1];

    const toInsert = [];
    for (const s of m.standings) {
      const amt = (posAmt[s.position - 1] || 0) / s.names.length;
      for (const name of s.names) {
        const pid = nameToId[name];
        if (pid) toInsert.push({ match_id: match.id, position: s.position, participant_id: pid, dollars_earned: amt });
      }
    }
    if (toInsert.length) await supabase.from('standings').insert(toInsert);
  }

  console.log('\nImport complete!');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
