import React, { useState, useEffect } from 'react';

function Timer({ initialSeconds, trigger, guess, myGuess, status, disableRandomButton }) {
    const [seconds, setSeconds] = useState(initialSeconds);

    useEffect(() => {
        // increment timer
        if (trigger && seconds > 0) {
            // disable buttons
            if (seconds === 16) {
                disableRandomButton();
            } else if (seconds === 8) {
                disableRandomButton();
            } else if (seconds === 4) {
                disableRandomButton();
            } else if (seconds === 2) {
                disableRandomButton();
            }

            const interval = setInterval(() => {
                setSeconds((seconds) => seconds - 1);
            }, 1000);
            return () => clearInterval(interval);

        } 
        // if timer expires and player did not guess
        else if (trigger && seconds === 0 && myGuess === "") {
            trigger = false;
            setSeconds(10);
            guess("-----")
        } 
        // when round is over and player guessed during the round
        else if (!trigger && (seconds !== 10 || myGuess !== "-----")) {
            setSeconds(30);
        }

    }, [trigger, seconds]);

    if (status === "during"){
        return <div>{seconds} seconds remaining</div>;
    }
}

export default Timer;