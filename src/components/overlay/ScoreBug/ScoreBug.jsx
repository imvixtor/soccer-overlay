import styles from './ScoreBug.module.css';
import { getRegulationEndSeconds } from '@/lib/match-constants';

/** Chuyển giây sang MM:SS */
function formatTime(seconds) {
    const s = Math.max(0, Math.floor(seconds));
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function ScoreBug({
    league = 'Giao hữu',
    agency = '',
    homeTeam = 'TEAM 1',
    awayTeam = 'TEAM 2',
    homeScore = 0,
    awayScore = 0,
    penaltyHome = 0,
    penaltyAway = 0,
    matchTime = 0,
    phase = 'FIRST_HALF',
    halfDuration = 45,
    extraDuration = 15,
    homeTeamAccentColor = '#0000FF',
    awayTeamAccentColor = '#FF0000',
}) {
    const isPenaltyPhase = phase === 'PENALTY_SHOOTOUT';
    const hideClock = phase === 'PENALTY_SHOOTOUT' || phase === 'POST_MATCH';
    const displayHomeScore = isPenaltyPhase ? penaltyHome : homeScore;
    const displayAwayScore = isPenaltyPhase ? penaltyAway : awayScore;

    const regulationEnd = getRegulationEndSeconds(
        phase,
        halfDuration,
        extraDuration,
    );
    const totalSeconds = Math.max(0, Math.floor(Number(matchTime)));
    const inStoppageTime = totalSeconds > regulationEnd;

    const mainTime = inStoppageTime ? regulationEnd : totalSeconds;
    const mainTimeStr = formatTime(mainTime);
    const additionalSeconds = inStoppageTime ? totalSeconds - regulationEnd : 0;
    const additionalTimeStr =
        additionalSeconds > 0 ? formatTime(additionalSeconds) : '';

    return (
        <div className={styles.scoreBugWrapper}>
            <div className={styles.leagueName}>
                {league}
                {agency && <span> - {agency}</span>}
                {isPenaltyPhase && <span> - Penalty</span>}
            </div>
            <div className={styles.scoreBugMain}>
                <div className={styles.teamSection}>
                    <div
                        className={styles.teamAccent}
                        style={{ backgroundColor: homeTeamAccentColor }}
                    />
                    <div className={styles.teamName}>{homeTeam}</div>
                    <div className={styles.scoreBox}>{displayHomeScore}</div>
                </div>

                <div className={styles.teamSection}>
                    <div className={styles.scoreBox}>{displayAwayScore}</div>
                    <div className={styles.teamName}>{awayTeam}</div>
                    <div
                        className={styles.teamAccent}
                        style={{ backgroundColor: awayTeamAccentColor }}
                    />
                </div>
            </div>
            {!hideClock && (
                <div className={styles.scoreBugTimer}>
                    <div className={styles.matchTimeSection}>
                        {mainTimeStr}
                    </div>
                    {additionalTimeStr && (
                        <div className={styles.additionalTimeSection}>
                            +{additionalTimeStr}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default ScoreBug;
