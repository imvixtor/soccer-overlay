import type { Enums } from '@/types/supabase';

export type MatchPhase = Enums<'MATCH_PHASE'>;
export type EventType = Enums<'EVENT_TYPE'>;

/** Order of match phases (aligned with DB enum MATCH_PHASE). */
export const PHASE_ORDER: MatchPhase[] = [
    'INITIATION',
    'PREPARATION',
    'PRE_MATCH',
    'FIRST_HALF',
    'HALFTIME',
    'SECOND_HALF',
    'FULLTIME',
    'EXTIME_FIRST_HALF',
    'EXTIME_HALF_TIME',
    'EXTIME_SECOND_HALF',
    'PENALTY_SHOOTOUT',
    'POST_MATCH',
];

/** Phases that require resetting the clock (start_at) when entered. */
const RESET_START_AT_PHASES: MatchPhase[] = [
    'FIRST_HALF',
    'SECOND_HALF',
    'EXTIME_FIRST_HALF',
    'EXTIME_SECOND_HALF',
    'PENALTY_SHOOTOUT',
];

export function shouldResetStartAt(phase: MatchPhase): boolean {
    return RESET_START_AT_PHASES.includes(phase);
}

export function getNextPhase(current: MatchPhase): MatchPhase | null {
    const i = PHASE_ORDER.indexOf(current);
    if (i < 0 || i >= PHASE_ORDER.length - 1) return null;
    return PHASE_ORDER[i + 1];
}

export function getPhaseIndex(phase: MatchPhase): number {
    return PHASE_ORDER.indexOf(phase);
}

/** Returns up to 3 most recent phases: (current-2), (current-1), current. */
export function getLastThreePhases(current: MatchPhase): MatchPhase[] {
    const i = getPhaseIndex(current);
    const from = Math.max(0, i - 2);
    return PHASE_ORDER.slice(from, i + 1);
}

/**
 * Returns exactly 3 phases for breadcrumb:
 * - At first phase (INIT): current + 2 next
 * - At last phase (POST): 2 previous + current
 * - Otherwise: 1 previous + current + 1 next
 */
export function getBreadcrumbPhases(current: MatchPhase): MatchPhase[] {
    const i = getPhaseIndex(current);
    const len = PHASE_ORDER.length;
    if (i < 0) return [];
    if (i === 0) return PHASE_ORDER.slice(0, Math.min(3, len)); // current + 2 next
    if (i === len - 1) return PHASE_ORDER.slice(Math.max(0, len - 3), len); // 2 prev + current
    return PHASE_ORDER.slice(i - 1, i + 2); // 1 prev + current + 1 next
}

export const PHASE_LABELS: Record<MatchPhase, string> = {
    INITIATION: 'Initiation',
    PREPARATION: 'Preparation',
    PRE_MATCH: 'Pre-match',
    FIRST_HALF: 'First half',
    HALFTIME: 'Half-time',
    SECOND_HALF: 'Second half',
    FULLTIME: 'Full-time',
    EXTIME_FIRST_HALF: 'Ex 1st half',
    EXTIME_HALF_TIME: 'Ex half-time',
    EXTIME_SECOND_HALF: 'Ex 2nd half',
    PENALTY_SHOOTOUT: 'Penalty shootout',
    POST_MATCH: 'Post-match',
};

/** Order of event types (aligned with DB enum EVENT_TYPE). */
export const EVENT_TYPE_ORDER: EventType[] = ['GOAL', 'YELLOW', 'RED', 'SUB'];

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
    GOAL: 'Goal',
    YELLOW: 'Yellow card',
    RED: 'Red card',
    SUB: 'Substitution',
};
