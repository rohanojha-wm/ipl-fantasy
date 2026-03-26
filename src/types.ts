export type MatchType = 'round_robin' | 'qualifier1' | 'qualifier2' | 'eliminator' | 'final';
export type Phase = 'round_robin' | 'knockout' | 'final';

export interface Season {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

export interface Participant {
  id: string;
  season_id: string;
  name: string;
  nickname: string | null;
  dream11_team_name: string | null;
  payment_zelle: string | null;
  payment_cashapp: string | null;
  payment_venmo: string | null;
  buy_in_amount: number | null;
  is_active: boolean;
  sort_order: number;
}

export interface Match {
  id: string;
  season_id: string;
  match_date: string;
  match_time: string | null;
  team1: string;
  team2: string;
  venue: string | null;
  match_type: MatchType;
  created_at: string;
  /** Set when admin saves standings; used for /matches sort */
  standings_updated_at?: string | null;
}

export interface Standing {
  id: string;
  match_id: string;
  position: number;
  participant_id: string;
  dollars_earned: number | null;
}

export interface PayoutConfig {
  id: string;
  season_id: string;
  phase: Phase;
  position_1st: number;
  position_2nd: number;
  position_3rd: number;
  position_4th: number;
  position_5th: number;
}

export interface LeaderboardEntry {
  participant_id: string;
  participant: Participant;
  total_winnings: number;
  matches_won: number;
  win_frequency: number;
  avg_per_win: number;
}

export interface StandingWithParticipant extends Standing {
  participant: Participant;
}

export interface MatchWithStandings extends Match {
  standings: StandingWithParticipant[];
}
