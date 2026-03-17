import type { Phase } from '../types';
import type { MatchType } from '../types';

const MATCH_TYPE_TO_PHASE: Record<MatchType, Phase> = {
  round_robin: 'round_robin',
  qualifier1: 'knockout',
  qualifier2: 'knockout',
  eliminator: 'knockout',
  final: 'final',
};

interface PayoutConfig {
  position_1st: number;
  position_2nd: number;
  position_3rd: number;
  position_4th: number;
  position_5th: number;
}

export function getPhaseForMatchType(matchType: MatchType): Phase {
  return MATCH_TYPE_TO_PHASE[matchType];
}

export function calculatePayouts(
  config: PayoutConfig,
  standingsByPosition: Record<number, string[]>
): Record<string, number> {
  const amounts: Record<string, number> = {};
  const positionKeys = ['position_1st', 'position_2nd', 'position_3rd', 'position_4th', 'position_5th'] as const;

  for (let pos = 1; pos <= 5; pos++) {
    const participants = standingsByPosition[pos] || [];
    const key = positionKeys[pos - 1];
    const total = config[key];
    const each = participants.length > 0 ? total / participants.length : 0;

    for (const pid of participants) {
      amounts[pid] = (amounts[pid] || 0) + each;
    }
  }

  return amounts;
}
