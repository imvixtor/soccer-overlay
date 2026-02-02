import { useState, useEffect } from 'react';
import styles from './GlobalClock.module.css';

function GlobalClock() {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const formatTime = (date) => {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    };

    return (
        <div className={styles.clock}>
            <div className={styles.time}>{formatTime(time)}</div>
        </div>
    );
}

export default GlobalClock;