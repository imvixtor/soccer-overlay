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

/** Phases that mark the start of a half (reset start_at, clear stop_at). */
const HALF_START_PHASES: MatchPhase[] = [
    'FIRST_HALF',
    'SECOND_HALF',
    'EXTIME_FIRST_HALF',
    'EXTIME_SECOND_HALF',
];

export function isHalfStartPhase(phase: MatchPhase): boolean {
    return HALF_START_PHASES.includes(phase);
}

/** Phases that mark the end of a half (set stop_at). */
const HALF_END_PHASES: MatchPhase[] = [
    'HALFTIME',
    'FULLTIME',
    'EXTIME_HALF_TIME',
];

export function isHalfEndPhase(phase: MatchPhase): boolean {
    return HALF_END_PHASES.includes(phase);
}

/** Phases mà đồng hồ không đếm (rest, fulltime, penalty, post_match) – hiển thị match_time từ DB. */
export const CLOCK_STOPPED_PHASES: MatchPhase[] = [
    'HALFTIME',
    'FULLTIME',
    'EXTIME_HALF_TIME',
    'PENALTY_SHOOTOUT',
    'POST_MATCH',
];

/** Phases mà đồng hồ đếm (đang thi đấu). */
export const CLOCK_RUNNING_PHASES: MatchPhase[] = [
    'FIRST_HALF',
    'SECOND_HALF',
    'EXTIME_FIRST_HALF',
    'EXTIME_SECOND_HALF',
];

export function isClockStoppedPhase(phase: MatchPhase): boolean {
    return CLOCK_STOPPED_PHASES.includes(phase);
}

export function isClockRunningPhase(phase: MatchPhase): boolean {
    return CLOCK_RUNNING_PHASES.includes(phase);
}

/** Chuyển match_time (giây) sang chuỗi MM:SS. */
export function formatMatchTimeSeconds(totalSeconds: number): string {
    const minutes = Math.floor(Math.max(0, totalSeconds) / 60);
    const seconds = Math.floor(Math.max(0, totalSeconds) % 60);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Tính thời gian bù (offset) dựa trên phase hiện tại.
 * @param phase Phase hiện tại
 * @param halfDuration Thời lượng một hiệp (phút)
 * @param extraDuration Thời lượng hiệp phụ (phút)
 * @returns Thời gian bù tính bằng giây
 */
export function getTimeOffset(
    phase: MatchPhase,
    halfDuration: number,
    extraDuration: number,
): number {
    switch (phase) {
        case 'FIRST_HALF':
            return 0;
        case 'SECOND_HALF':
            return halfDuration * 60; // Chuyển phút sang giây
        case 'EXTIME_FIRST_HALF':
            return 2 * halfDuration * 60;
        case 'EXTIME_SECOND_HALF':
            return 2 * halfDuration * 60 + extraDuration * 60;
        default:
            return 0;
    }
}

export function getNextPhase(current: MatchPhase): MatchPhase | null {
    const i = PHASE_ORDER.indexOf(current);
    if (i < 0 || i >= PHASE_ORDER.length - 1) return null;
    return PHASE_ORDER[i + 1];
}

/**
 * Lấy phase tiếp theo dựa trên config, bỏ qua các phase không áp dụng.
 * @param current Phase hiện tại
 * @param extraDuration Thời lượng hiệp phụ (0 = không có hiệp phụ)
 * @param hasPenaltyShootout Có thi đấu penalty không
 * @returns Phase tiếp theo hoặc null nếu không có
 */
export function getNextPhaseWithConfig(
    current: MatchPhase,
    extraDuration: number,
    hasPenaltyShootout: boolean,
): MatchPhase | null {
    const i = PHASE_ORDER.indexOf(current);
    if (i < 0 || i >= PHASE_ORDER.length - 1) return null;

    // Tìm phase tiếp theo hợp lệ
    for (let j = i + 1; j < PHASE_ORDER.length; j++) {
        const candidate = PHASE_ORDER[j];

        // Bỏ qua các phase hiệp phụ nếu không có hiệp phụ
        if (extraDuration === 0) {
            if (
                candidate === 'EXTIME_FIRST_HALF' ||
                candidate === 'EXTIME_HALF_TIME' ||
                candidate === 'EXTIME_SECOND_HALF'
            ) {
                continue;
            }
        }

        // Bỏ qua penalty nếu không có penalty
        if (!hasPenaltyShootout && candidate === 'PENALTY_SHOOTOUT') {
            continue;
        }

        return candidate;
    }

    return null;
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
    INITIATION: 'Khởi tạo',
    PREPARATION: 'Chuẩn bị',
    PRE_MATCH: 'Trước trận',
    FIRST_HALF: 'Hiệp 1',
    HALFTIME: 'Nghỉ giữa hiệp',
    SECOND_HALF: 'Hiệp 2',
    FULLTIME: 'Hết giờ',
    EXTIME_FIRST_HALF: 'HP 1',
    EXTIME_HALF_TIME: 'Nghỉ HP',
    EXTIME_SECOND_HALF: 'HP 2',
    PENALTY_SHOOTOUT: 'Luân lưu',
    POST_MATCH: 'Kết thúc',
};

/** Order of event types (aligned with DB enum EVENT_TYPE). */
export const EVENT_TYPE_ORDER: EventType[] = ['GOAL', 'YELLOW', 'RED', 'SUB'];

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
    GOAL: 'Bàn thắng',
    YELLOW: 'Thẻ vàng',
    RED: 'Thẻ đỏ',
    SUB: 'Thay người',
};
