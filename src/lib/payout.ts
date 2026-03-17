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

/**
 * Calculate payouts with pooled tie logic: when N people tie for a slot,
 * they split the combined payout for positions P..P+N-1.
 * E.g. 2 tied for 2nd → split 2nd+3rd place money.
 */
export function calculatePayouts(
  config: PayoutConfig,
  standingsByPosition: Record<number, string[]>
): Record<string, number> {
  const amounts: Record<string, number> = {};
  const positionKeys = ['position_1st', 'position_2nd', 'position_3rd', 'position_4th', 'position_5th'] as const;

  let nextSlotStart = 1;
  for (let slotPos = 1; slotPos <= 5; slotPos++) {
    const participants = standingsByPosition[slotPos] || [];
    const count = participants.length;
    if (count === 0) continue;

    let pool = 0;
    for (let i = 0; i < count && nextSlotStart + i <= 5; i++) {
      pool += config[positionKeys[nextSlotStart + i - 1]];
    }
    const each = pool / count;

    for (const pid of participants) {
      amounts[pid] = (amounts[pid] || 0) + each;
    }
    nextSlotStart += count;
  }

  return amounts;
}
