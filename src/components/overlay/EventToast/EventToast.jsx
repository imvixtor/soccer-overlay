import { memo } from 'react';
import styles from './EventToast.module.css';

const EventToast = memo(function EventToast({ type = "TYPE", message = "Event Message" }) {
    return (
        <div className={styles.eventToast}>
            <div className={styles.eventToastContent}>
                <div>{type}</div>
                <div>{message}</div>
            </div>
            <div className={styles.eventToastFooter}></div>
        </div>
    );
});

export default EventToast;
