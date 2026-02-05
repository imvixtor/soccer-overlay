import { memo, useMemo } from 'react';
import styles from './Lineup.module.css';

function chunkPlayers(players, maxPerRow) {
    const rows = [];
    for (let i = 0; i < players.length; i += maxPerRow) {
        rows.push(players.slice(i, i + maxPerRow));
    }
    return rows;
}

const Lineup = memo(function Lineup({ match, players, teams, isAway }) {
    if (!match) return null;

    const teamId = isAway ? match.away_team : match.home_team;
    const teamData = isAway ? match.away_team_data : match.home_team_data;
    const accentColor = isAway
        ? (match?.away_color ?? '#FF0000')
        : (match?.home_color ?? '#0000FF');

    const onFieldPlayers = useMemo(
        () =>
            players
                .filter((p) => p.team_id === teamId && p.is_on_field)
                .sort((a, b) => a.number - b.number),
        [players, teamId],
    );

    const benchPlayers = useMemo(
        () =>
            players
                .filter((p) => p.team_id === teamId && !p.is_on_field)
                .sort((a, b) => a.number - b.number),
        [players, teamId],
    );

    const teamName =
        teamData?.name ||
        teamData?.short_name ||
        (isAway ? 'Đội khách' : 'Đội nhà');

    const starterRows = useMemo(
        () => chunkPlayers(onFieldPlayers, 3),
        [onFieldPlayers],
    );

    const coachName = useMemo(() => {
        const teamRow = teams?.find((t) => t.id === teamId);
        return teamRow?.coach?.trim() || null;
    }, [teams, teamId]);

    return (
        <div
            className={styles.overlayLineup}
            style={{ '--team-accent': accentColor }}
        >
            <div className={styles.overlayLineupCard}>
                <div className={styles.overlayLineupTopbar}>ĐỘI HÌNH</div>
                <div className={styles.overlayLineupContent}>
                    <div className={styles.overlayLineupLeft}>
                        <div className={styles.overlayLineupLeftSection}>
                            <div className={styles.overlayLineupLeftTitle}>
                                CẦU THỦ DỰ BỊ
                            </div>
                            <div className={styles.overlayLineupSubs}>
                                {benchPlayers.map((p) => (
                                    <div
                                        key={p.id}
                                        className={styles.overlayLineupSubItem}
                                    >
                                        <span
                                            className={
                                                styles.overlayLineupSubNumber
                                            }
                                        >
                                            {p.number}
                                        </span>
                                        <span
                                            className={
                                                styles.overlayLineupSubName
                                            }
                                        >
                                            {p.nickname?.trim() ||
                                                p.full_name?.trim() ||
                                                '—'}
                                        </span>
                                    </div>
                                ))}
                                {benchPlayers.length === 0 && (
                                    <div
                                        className={styles.overlayLineupSubEmpty}
                                    >
                                        Không có cầu thủ dự bị
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className={styles.overlayLineupCoachBlock}>
                            <div className={styles.overlayLineupLeftTitle}>
                                HUẤN LUYỆN VIÊN
                            </div>
                            <div className={styles.overlayLineupCoachName}>
                                {coachName || '—'}
                            </div>
                        </div>
                    </div>

                    <div className={styles.overlayLineupRight}>
                        <div className={styles.overlayLineupPitch}>
                            <div className={styles.overlayLineupPitchCenter} />
                            <div
                                className={styles.overlayLineupPitchSemicircle}
                            />
                            <div className={styles.overlayLineupPitchBox} />
                            <div className={styles.overlayLineupPitchPlayers}>
                                {starterRows.map((row, rowIndex) => (
                                    <div
                                        key={rowIndex}
                                        className={
                                            styles.overlayLineupPlayerRow
                                        }
                                    >
                                        {row.map((p) => (
                                            <div
                                                key={p.id}
                                                className={
                                                    styles.overlayLineupPlayer
                                                }
                                            >
                                                <span
                                                    className={
                                                        styles.overlayLineupPlayerNumber
                                                    }
                                                >
                                                    {p.number}
                                                </span>
                                                <span
                                                    className={
                                                        styles.overlayLineupPlayerName
                                                    }
                                                >
                                                    {p.nickname?.trim() ||
                                                        p.full_name?.trim() ||
                                                        '—'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className={styles.overlayLineupBottombar}>
                    <span className={styles.overlayLineupTeamName}>
                        {teamName}
                    </span>
                </div>
            </div>
        </div>
    );
});

export default Lineup;
