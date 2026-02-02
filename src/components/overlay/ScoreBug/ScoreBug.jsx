import styles from './ScoreBug.module.css';

function ScoreBug({
    league = "Giao hữu",
    agency = "",
    homeTeam = "TEAM 1",
    awayTeam = "TEAM 2",
    homeScore = 0,
    awayScore = 0,
    matchTime = "Time",
    additionalTime = "",
    homeTeamAccentColor = "#0000FF",
    awayTeamAccentColor = "#FF0000"
}) {
    return (
        <>
            <div className={styles.leagueName}>
                {league}
                {agency && <span> - {agency}</span>}
            </div>
            <div className={styles.scoreBug}>
                <div className={styles.teamSection}>
                    <div className={styles.teamAccent} style={{ backgroundColor: homeTeamAccentColor }}></div>
                    <div className={styles.teamName}>{homeTeam}</div>
                    <div className={styles.scoreBox}>{homeScore}</div>
                </div>

                <div className={styles.teamSection}>
                    <div className={styles.scoreBox}>{awayScore}</div>
                    <div className={styles.teamName}>{awayTeam}</div>
                    <div className={styles.teamAccent} style={{ backgroundColor: awayTeamAccentColor }}></div>
                </div>

                <div className={styles.matchTimeSection}>{matchTime}</div>

                {additionalTime && (
                    <div className={styles.additionalTimeSection}>+ {additionalTime}</div>
                )}
            </div>
        </>
    );
}

export default ScoreBug;