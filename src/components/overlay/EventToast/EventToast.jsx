import styles from './EventToast.module.css';

function EventToast({
    type = "TYPE",
    message = "Event Message",
    inText,
    outText,
}) {
    return (
        <div className={styles.eventToast}>
            <div className={styles.eventToastContent}>
                <div>{type}</div>
                <div className={styles.eventToastDetails}>
                    {inText ? (
                        <>
                            <div className={styles.eventToastIn}>{inText}</div>
                            {outText ? (
                                <div className={styles.eventToastOut}>
                                    {outText}
                                </div>
                            ) : null}
                        </>
                    ) : (
                        <div className={styles.eventToastSingle}>{message}</div>
                    )}
                </div>
            </div>
            <div className={styles.eventToastFooter}></div>
        </div>
    );
}

export default EventToast;
