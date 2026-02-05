import {
    createContext,
    useContext,
    useEffect,
    useState,
    useMemo,
    type ReactNode,
} from 'react';
import {
    getTimeOffset,
    isClockStoppedPhase,
    formatMatchTimeSeconds,
} from '@/lib/match-constants';
import type { MatchPhase } from '@/lib/match-constants';

type MatchTimeContextValue = {
    displayMatchTime: string;
    scoreBugMatchTimeSeconds: number;
};

const MatchTimeContext = createContext<MatchTimeContextValue | null>(null);

function useMatchTime() {
    const ctx = useContext(MatchTimeContext);
    return ctx ?? { displayMatchTime: '00:00', scoreBugMatchTimeSeconds: 0 };
}

type MatchTimeProviderProps = {
    phase: MatchPhase;
    halfDuration: number;
    extraDuration: number;
    matchTimeFromDb: number | null;
    matchStartAt: string | null;
    matchStopAt: string | null;
    children: ReactNode;
};

function MatchTimeProvider({
    phase,
    halfDuration,
    extraDuration,
    matchTimeFromDb,
    matchStartAt,
    matchStopAt,
    children,
}: MatchTimeProviderProps) {
    const [matchTime, setMatchTime] = useState('00:00');
    const [matchTimeSeconds, setMatchTimeSeconds] = useState(0);

    const stoppedPhaseTime =
        isClockStoppedPhase(phase) && matchTimeFromDb != null
            ? formatMatchTimeSeconds(matchTimeFromDb)
            : null;

    const noStartTime =
        !isClockStoppedPhase(phase) && !matchStartAt ? '00:00' : null;

    // Khi đồng hồ đã dừng (matchStopAt có): tính toán trong render, không cần effect
    const computedWhenStopped = useMemo(() => {
        if (isClockStoppedPhase(phase) || !matchStartAt || !matchStopAt)
            return null;
        const timeOffset = getTimeOffset(phase, halfDuration, extraDuration);
        const start = new Date(matchStartAt).getTime();
        const stop = new Date(matchStopAt).getTime();
        const elapsed = Math.floor((stop - start) / 1000);
        const totalSeconds = Math.max(0, elapsed + timeOffset);
        const minutes = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        const formatted = `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        return { matchTime: formatted, matchTimeSeconds: totalSeconds };
    }, [matchStartAt, matchStopAt, phase, halfDuration, extraDuration]);

    useEffect(() => {
        if (isClockStoppedPhase(phase) || !matchStartAt || matchStopAt) return;

        const timeOffset = getTimeOffset(phase, halfDuration, extraDuration);
        const start = new Date(matchStartAt).getTime();

        const updateTime = () => {
            const now = Date.now();
            const elapsed = Math.floor((now - start) / 1000);
            const totalSeconds = Math.max(0, elapsed + timeOffset);
            setMatchTimeSeconds(totalSeconds);
            const minutes = Math.floor(totalSeconds / 60);
            const secs = totalSeconds % 60;
            setMatchTime(
                `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`,
            );
        };
        updateTime();
        const interval = setInterval(updateTime, 1000);
        return () => clearInterval(interval);
    }, [matchStartAt, matchStopAt, phase, halfDuration, extraDuration]);

    const matchTimeForDisplay = computedWhenStopped?.matchTime ?? matchTime;
    const matchTimeSecondsForDisplay =
        computedWhenStopped?.matchTimeSeconds ?? matchTimeSeconds;

    const displayMatchTime =
        stoppedPhaseTime ?? noStartTime ?? matchTimeForDisplay;

    const scoreBugMatchTimeSeconds =
        isClockStoppedPhase(phase) && matchTimeFromDb != null
            ? matchTimeFromDb
            : !matchStartAt && !isClockStoppedPhase(phase)
              ? 0
              : matchTimeSecondsForDisplay;

    const value = useMemo<MatchTimeContextValue>(
        () => ({ displayMatchTime, scoreBugMatchTimeSeconds }),
        [displayMatchTime, scoreBugMatchTimeSeconds],
    );

    return (
        <MatchTimeContext.Provider value={value}>
            {children}
        </MatchTimeContext.Provider>
    );
}

MatchTimeProvider.useMatchTime = useMatchTime;

export { MatchTimeProvider };
