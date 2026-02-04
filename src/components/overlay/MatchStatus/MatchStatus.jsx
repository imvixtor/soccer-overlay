import styles from './MatchStatus.module.css';

function MatchStatus({
    matchTime = '61:23',
    showMatchTime = true,
    period = 'HIỆP 2',
    league = 'Giao hữu',
    agency = '',
    events = [],
    homeTeam = 'THÁI SƠN',
    awayTeam = 'THẠCH KHUÂN',
    homeScore = 3,
    awayScore = 0,
    penaltyHome = 0,
    penaltyAway = 0,
    homeTeamAccentColor = '#0000FF',
    awayTeamAccentColor = '#FF0000',
}) {
    const hasPenalty = penaltyHome > 0 || penaltyAway > 0;
    const homeEvents = events.filter((event) => event.team === 'home');
    const awayEvents = events.filter((event) => event.team === 'away');

    return (
        <div className={styles.matchStatus}>
            <div className={styles.topBar}>
                {showMatchTime && <span>{matchTime}</span>}
                {showMatchTime && <span>&nbsp;-&nbsp;</span>}
                <span>{period.toLowerCase()}</span>
                <span>&nbsp;-&nbsp;{league}</span>
                {agency && <span>&nbsp;-&nbsp;{agency}</span>}
            </div>

            <div className={styles.middleBar}>
                <div className={styles.eventsLeft}>
                    {homeEvents.map((event) => (
                        <div key={event.id} className={styles.eventItem}>
                            {event.minute}&apos; {event.playerName}{' '}
                            {event.shirtNumber}
                            {event.type && event.type !== 'goal' && (
                                <span className={styles.eventType}>
                                    {' '}
                                    ({event.type})
                                </span>
                            )}
                        </div>
                    ))}
                </div>
                <div className={styles.eventsRight}>
                    {awayEvents.map((event) => (
                        <div key={event.id} className={styles.eventItem}>
                            {event.minute}&apos; {event.playerName}{' '}
                            {event.shirtNumber}
                            {event.type && event.type !== 'goal' && (
                                <span className={styles.eventType}>
                                    {' '}
                                    ({event.type})
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className={styles.bottomBar}>
                <div className={styles.teamSection}>
                    <div
                        className={styles.teamAccent}
                        style={{ backgroundColor: homeTeamAccentColor }}
                    ></div>
                    <div className={styles.teamName}>{homeTeam}</div>
                </div>
                <div className={styles.scoreBox}>
                    <div className={styles.mainScore}>
                        {homeScore} - {awayScore}
                    </div>
                    {hasPenalty && (
                        <div className={styles.penaltyScore}>
                            ({penaltyHome}-{penaltyAway})
                        </div>
                    )}
                </div>
                <div className={styles.teamSection}>
                    <div className={styles.teamName}>{awayTeam}</div>
                    <div
                        className={styles.teamAccent}
                        style={{ backgroundColor: awayTeamAccentColor }}
                    ></div>
                </div>
            </div>
        </div>
    );
}

export default MatchStatus;
