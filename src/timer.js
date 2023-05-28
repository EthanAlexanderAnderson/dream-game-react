import React, { useState, useEffect } from 'react';

function Timer({ initialSeconds, trigger, guess, myGuess, status }) {
    const [seconds, setSeconds] = useState(initialSeconds);

    useEffect(() => {
        if (trigger && seconds > 0) {
            const interval = setInterval(() => {
                setSeconds((seconds) => seconds - 1);
            }, 1000);
            return () => clearInterval(interval);
        } else if (trigger && seconds === 0 && myGuess === "") {
            trigger = false;
            setSeconds(10);
            guess("-----")
        } else if (!trigger && (seconds !== 10 || myGuess !== "-----")) {
            setSeconds(30);
        }
    }, [trigger, seconds]);

    if (status === "during"){
        return <div>{seconds} seconds remaining</div>;
    }
}

export default Timer;