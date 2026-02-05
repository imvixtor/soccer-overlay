import { useState, useEffect, useRef } from 'react';
import { useLoaderData, useRevalidator } from 'react-router';
import { ChevronRight, LayoutDashboard, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
    getBreadcrumbPhases,
    getNextPhaseWithConfig,
    PHASE_LABELS,
    PHASE_ORDER,
    getTimeOffset,
    isClockStoppedPhase,
    formatMatchTimeSeconds,
    type MatchPhase,
} from '@/lib/match-constants';
import MatchControlPanel from '@/components/matchControl/matchControlPanel';
import OverlayControlPanel from '@/components/matchControl/overlayControlPanel';
import type { MatchLoaderData } from '@/types/loader';
import {
    updateMatchPhase,
    resetMatchWithPlayers,
} from '@/services/matches.api';
import { supabase } from '@/lib/supabase/client';
import { upsertOverlayControl } from '@/services/control.api';

const DEFAULT_PHASE: MatchPhase = 'INITIATION';

function getBreadcrumbPhasesWithConfig(
    current: MatchPhase,
    extraDuration: number,
    hasPenaltyShootout: boolean,
): MatchPhase[] {
    let order = PHASE_ORDER;

    // Nếu không có hiệp phụ: ẩn toàn bộ phase hiệp phụ khỏi breadcrumb
    if (extraDuration === 0) {
        order = order.filter(
            (p) =>
                p !== 'EXTIME_FIRST_HALF' &&
                p !== 'EXTIME_HALF_TIME' &&
                p !== 'EXTIME_SECOND_HALF',
        );
    }

    // Nếu không có luân lưu: ẩn phase penalty khỏi breadcrumb
    if (!hasPenaltyShootout) {
        order = order.filter((p) => p !== 'PENALTY_SHOOTOUT');
    }

    const len = order.length;
    const i = order.indexOf(current);
    if (i < 0) {
        // Fallback: trong trường hợp phase hiện tại không nằm trong order đã lọc
        return getBreadcrumbPhases(current);
    }
    if (i === 0) return order.slice(0, Math.min(3, len));
    if (i === len - 1) return order.slice(Math.max(0, len - 3), len);
    return order.slice(i - 1, i + 2);
}

type ViewMode = 'match' | 'overlay';

export default function MatchControlPage() {
    const {
        match: initialMatch,
        matchConfig,
        teams,
        userId,
        lineup,
        overlayControl,
    } = useLoaderData() as MatchLoaderData;
    const { revalidate } = useRevalidator();
    const [match, setMatch] = useState(initialMatch);
    const [viewMode, setViewMode] = useState<ViewMode>('match');
    const [matchTime, setMatchTime] = useState<string>('00:00');
    const [pendingAction, setPendingAction] = useState<
        null | 'NEXT_PHASE' | 'END_MATCH' | 'RESET_MATCH'
    >(null);
    const [isConfirming, setIsConfirming] = useState(false);
    const confirmDialogRef = useRef<HTMLDialogElement>(null);

    // Đồng bộ state với loader data khi loader revalidate
    useEffect(() => {
        setMatch(initialMatch);
    }, [initialMatch]);

    // Thiết lập realtime subscription
    useEffect(() => {
        if (!match?.id) return;

        const channel = supabase
            .channel(`match:${match.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'matches',
                    filter: `id=eq.${match.id}`,
                },
                (payload) => {
                    const updatedMatch = payload.new as typeof match;
                    setMatch((prev) =>
                        prev ? { ...prev, ...updatedMatch } : null,
                    );
                    revalidate();
                },
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [match?.id, revalidate]);

    // Tính toán match time theo quy tắc đồng hồ
    useEffect(() => {
        const phase = match?.phase ?? DEFAULT_PHASE;

        // Ở phase đồng hồ dừng (rest, fulltime, penalty, post_match): hiển thị match_time từ DB
        if (isClockStoppedPhase(phase)) {
            const stored = match?.match_time ?? 0;
            setMatchTime(formatMatchTimeSeconds(stored));
            return;
        }

        // Nếu không có start_at, hiển thị 00:00
        if (!match?.start_at) {
            setMatchTime('00:00');
            return;
        }

        // Lấy thời gian bù dựa trên phase
        const halfDuration = matchConfig?.half_duration ?? 45; // mặc định 45 phút
        const extraDuration = matchConfig?.extra_duration ?? 15; // mặc định 15 phút
        const timeOffset = getTimeOffset(phase, halfDuration, extraDuration);

        const start = new Date(match.start_at).getTime();

        // Nếu stop_at là null: đồng hồ đếm từ start_at + thời gian bù
        if (!match.stop_at) {
            const updateTime = () => {
                const now = Date.now();
                const elapsed = Math.floor((now - start) / 1000); // seconds
                const totalSeconds = Math.max(0, elapsed + timeOffset);
                const minutes = Math.floor(totalSeconds / 60);
                const seconds = totalSeconds % 60;
                setMatchTime(
                    `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
                );
            };

            updateTime();
            const interval = setInterval(updateTime, 1000);

            return () => clearInterval(interval);
        } else {
            // Nếu stop_at không null: hiển thị thời gian đã dừng (từ start_at đến stop_at + thời gian bù)
            const stop = new Date(match.stop_at).getTime();
            const elapsed = Math.floor((stop - start) / 1000); // seconds
            const totalSeconds = Math.max(0, elapsed + timeOffset);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            setMatchTime(
                `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
            );
        }
    }, [
        match?.start_at,
        match?.stop_at,
        match?.phase,
        match?.match_time,
        matchConfig?.half_duration,
        matchConfig?.extra_duration,
    ]);

    const extraDuration = matchConfig?.extra_duration ?? 0;
    const hasPenaltyShootout = matchConfig?.has_penalty_shootout ?? false;
    const phase = match?.phase ?? DEFAULT_PHASE;
    const breadcrumbPhases = getBreadcrumbPhasesWithConfig(
        phase,
        extraDuration,
        hasPenaltyShootout,
    );
    const next = getNextPhaseWithConfig(
        phase,
        extraDuration,
        hasPenaltyShootout,
    );

    const playersPerTeam = matchConfig?.players_per_team ?? 11;
    const isPreparationReady =
        phase !== 'PREPARATION'
            ? true
            : (match?.home_team ?? null) != null &&
              (match?.away_team ?? null) != null &&
              lineup.homeOnField === playersPerTeam &&
              lineup.awayOnField === playersPerTeam;

    const canNextPhase = Boolean(next) && isPreparationReady;

    const autoAdjustOverlayForPhase = async (newPhase: MatchPhase) => {
        if (!userId) return;

        try {
            // Reset / giai đoạn khởi tạo: chỉ bật đồng hồ, tắt mọi overlay khác
            if (newPhase === 'INITIATION' || newPhase === 'PREPARATION') {
                await upsertOverlayControl(userId, {
                    clock_enable: true,
                    scorebug_enable: false,
                    match_status_enable: false,
                    lineup_enable: false,
                    away_lineup: false,
                });
                return;
            }

            // Trước trận: tắt lineup (cho phép bật thủ công trong phase này)
            if (newPhase === 'PRE_MATCH') {
                await upsertOverlayControl(userId, {
                    lineup_enable: false,
                    away_lineup: false,
                });
                return;
            }

            // Vào hiệp đấu: tự động bật scorebug và match status, tắt lineup
            if (
                newPhase === 'FIRST_HALF' ||
                newPhase === 'SECOND_HALF' ||
                newPhase === 'EXTIME_FIRST_HALF' ||
                newPhase === 'EXTIME_SECOND_HALF'
            ) {
                await upsertOverlayControl(userId, {
                    scorebug_enable: true,
                    match_status_enable: true,
                    lineup_enable: false,
                    away_lineup: false,
                });
                return;
            }

            // Nghỉ giữa hiệp: tắt scorebug, bật match status, tắt lineup
            if (newPhase === 'HALFTIME' || newPhase === 'EXTIME_HALF_TIME') {
                await upsertOverlayControl(userId, {
                    scorebug_enable: false,
                    match_status_enable: true,
                    lineup_enable: false,
                    away_lineup: false,
                });
                return;
            }

            // Hết giờ (FULLTIME): tắt scorebug, bật match status, tắt lineup
            if (newPhase === 'FULLTIME') {
                await upsertOverlayControl(userId, {
                    scorebug_enable: false,
                    match_status_enable: true,
                    lineup_enable: false,
                    away_lineup: false,
                });
                return;
            }

            // Luân lưu: bật scorebug và match status, tắt lineup
            if (newPhase === 'PENALTY_SHOOTOUT') {
                await upsertOverlayControl(userId, {
                    scorebug_enable: true,
                    match_status_enable: true,
                    lineup_enable: false,
                    away_lineup: false,
                });
                return;
            }

            // Kết thúc trận: tắt scorebug, bật match status, tắt lineup
            if (newPhase === 'POST_MATCH') {
                await upsertOverlayControl(userId, {
                    scorebug_enable: false,
                    match_status_enable: true,
                    lineup_enable: false,
                    away_lineup: false,
                });
            }
        } catch {
            // Ignore overlay auto-adjust errors
        }
    };

    const handleNextPhase = async () => {
        if (!match?.id || !next || !isPreparationReady) return;
        const { error } = await updateMatchPhase(match.id, next);
        if (!error) {
            await autoAdjustOverlayForPhase(next);
            revalidate();
        }
    };

    const handleEndMatch = async () => {
        if (!match?.id) return;
        const { error } = await updateMatchPhase(match.id, 'POST_MATCH');
        if (!error) {
            await autoAdjustOverlayForPhase('POST_MATCH');
            revalidate();
        }
    };

    const handleResetMatch = async () => {
        if (!match?.id) return;
        const { error } = await resetMatchWithPlayers(match.id, userId);
        if (!error) {
            // Sau khi reset, quay về INITIATION và chỉ hiển thị đồng hồ
            await autoAdjustOverlayForPhase('INITIATION');
            revalidate();
        }
    };

    const handleConfirmAction = async () => {
        if (!pendingAction) return;
        setIsConfirming(true);
        try {
            if (pendingAction === 'NEXT_PHASE') {
                await handleNextPhase();
            } else if (pendingAction === 'END_MATCH') {
                await handleEndMatch();
            } else if (pendingAction === 'RESET_MATCH') {
                await handleResetMatch();
            }
        } finally {
            setIsConfirming(false);
            setPendingAction(null);
        }
    };

    // Open/close confirm dialog with backdrop (requires showModal()).
    useEffect(() => {
        const el = confirmDialogRef.current;
        if (!el) return;
        if (pendingAction) el.showModal();
        else el.close();
    }, [pendingAction]);

    const closeConfirmDialog = () => {
        if (isConfirming) return;
        setPendingAction(null);
    };

    return (
        <div className="space-y-4">
            <h1 className="text-center text-xl font-semibold tracking-tight sm:text-2xl">
                Điều khiển trận đấu
            </h1>

            {/* View switcher: Match panel | Overlay panel */}
            <div className="flex justify-center">
                <div
                    role="tablist"
                    aria-label="Chuyển giữa Bảng điều khiển trận và Bảng overlay"
                    className="inline-flex rounded-lg border bg-muted/50 p-1"
                >
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewMode('match')}
                        aria-pressed={viewMode === 'match'}
                        aria-selected={viewMode === 'match'}
                        role="tab"
                        className={cn(
                            'gap-2',
                            viewMode === 'match' &&
                                'bg-background text-foreground shadow-sm border',
                        )}
                    >
                        <LayoutDashboard className="size-4" />
                        Bảng trận đấu
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewMode('overlay')}
                        aria-pressed={viewMode === 'overlay'}
                        aria-selected={viewMode === 'overlay'}
                        role="tab"
                        className={cn(
                            'gap-2',
                            viewMode === 'overlay' &&
                                'bg-background text-foreground shadow-sm border',
                        )}
                    >
                        <Monitor className="size-4" />
                        Bảng overlay
                    </Button>
                </div>
            </div>

            {/* Breadcrumb: last 3 phases */}
            <nav
                aria-label="Breadcrumb"
                className="flex items-center gap-1.5 text-sm justify-center"
            >
                {breadcrumbPhases.map((p, i) => (
                    <span key={p} className="flex items-center gap-1.5">
                        {i > 0 && (
                            <ChevronRight
                                className="size-4 shrink-0 text-muted-foreground"
                                aria-hidden
                            />
                        )}
                        <span
                            className={
                                p === phase
                                    ? 'font-medium text-foreground'
                                    : 'text-muted-foreground'
                            }
                        >
                            {PHASE_LABELS[p]}
                        </span>
                    </span>
                ))}
            </nav>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 justify-between">
                {phase == 'POST_MATCH' ? (
                    <Button
                        variant="destructive"
                        onClick={() => setPendingAction('RESET_MATCH')}
                    >
                        Reset trận
                    </Button>
                ) : (
                    <Button
                        variant="destructive"
                        onClick={() => setPendingAction('END_MATCH')}
                        disabled={
                            phase === 'INITIATION' || phase === 'PREPARATION'
                        }
                    >
                        Kết thúc trận
                    </Button>
                )}
                <Button
                    onClick={() => setPendingAction('NEXT_PHASE')}
                    disabled={!canNextPhase}
                >
                    Giai đoạn tiếp
                </Button>
            </div>

            {phase === 'PREPARATION' && !isPreparationReady && (
                <p className="text-sm text-muted-foreground text-center">
                    Cần chọn đủ đội hình ra sân ({playersPerTeam} cầu thủ mỗi
                    đội) trước khi sang phase tiếp theo.
                </p>
            )}

            {/* Content: Match panel or Overlay panel */}
            {viewMode === 'match' ? (
                <MatchControlPanel
                    phase={phase}
                    match={match}
                    matchConfig={matchConfig}
                    teams={teams}
                    userId={userId}
                    matchTime={matchTime}
                    overlayControl={overlayControl}
                    onMatchUpdated={revalidate}
                />
            ) : (
                <OverlayControlPanel
                    userId={userId}
                    initialControl={overlayControl}
                    phase={phase}
                />
            )}

            {/* Confirm modal */}
            <dialog
                ref={confirmDialogRef}
                className="fixed top-1/2 left-1/2 z-50 w-full max-w-[calc(100vw-2rem)] sm:max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-card p-0 shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
                onCancel={(e) => {
                    e.preventDefault();
                    closeConfirmDialog();
                }}
            >
                <div className="px-4 pt-4 pb-3 sm:px-5">
                    <h2 className="text-base font-semibold">
                        Xác nhận thao tác
                    </h2>
                </div>
                <div className="px-4 pb-4 pt-0 sm:px-5 space-y-2">
                    <p className="text-sm text-muted-foreground">
                        {pendingAction === 'NEXT_PHASE' &&
                            `Chuyển sang phase tiếp theo${
                                next ? ` (${PHASE_LABELS[next]})` : ''
                            }?`}
                        {pendingAction === 'END_MATCH' &&
                            'Kết thúc trận đấu và chuyển sang Kết thúc?'}
                        {pendingAction === 'RESET_MATCH' &&
                            'Reset trận đấu, xoá toàn bộ sự kiện và đưa cầu thủ về trạng thái mặc định?'}
                    </p>
                    <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            disabled={isConfirming}
                            onClick={closeConfirmDialog}
                        >
                            Huỷ
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={handleConfirmAction}
                            disabled={isConfirming}
                        >
                            {isConfirming ? 'Đang thực hiện…' : 'Xác nhận'}
                        </Button>
                    </div>
                </div>
            </dialog>
        </div>
    );
}
