import React, { useState, useEffect } from 'react';

function Timer({ initialSeconds, trigger, guess, myGuess, status, disableRandomButton, position }) {
    const [seconds, setSeconds] = useState(initialSeconds);

    let equityDisables = [];
    for (let i = 0; i < position; i++) {
        equityDisables.push((2**(i)) * 3)
    }
    useEffect(() => {
        // increment timer
        if (trigger && seconds > 0) {
            // disable buttons
            if (seconds && (seconds & (seconds - 1)) === 0) {
                disableRandomButton();
            }
            // extra button disables for lower ranked players
            if (equityDisables.includes(seconds)) {
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
            setSeconds(30 + (position * 5));
        }

    }, [trigger, seconds]);

    if (status === "during"){
        return <div>{seconds} seconds remaining</div>;
    }
}

export default Timer;