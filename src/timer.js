import React, { useState, useEffect } from 'react';

function Timer({ trigger, guess, myGuess, status, disableRandomButton, position, tick, difficulty, rank}) {
    const [added, setAdded] = useState(false); // this a switch to prevent the timer from adding length-based-time more than once
    const [seconds, setSeconds] = useState(10);

    let equityDisables = [];
    // disable buttons at percentage of timer intervals (no disables after 80% of timer to discourage stalling)
    // -- for lower positions on leaderboard
    for (let i = 0; i < position; i++) {
        let initialTime = (10 + (position * 5) + trigger);
        let secondsAfterInitalTime = Math.floor(initialTime * (0.1 * (i + 1))); // 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8
        equityDisables.push(initialTime - secondsAfterInitalTime);
        if ( i > 7) { break; }
    }
    // -- for lower rank than dream difficulty
    for (let i = 0; i < (difficulty-rank); i++) {
        let initialTime = (10 + (position * 5) + trigger);
        let secondsAfterInitalTime = Math.floor(initialTime * (0.1 * (i + 1) + 0.05)); // 0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75
        equityDisables.push(initialTime - secondsAfterInitalTime);
        if ( i > 6) { break; }
    }
    useEffect(() => {
        // if timer is running
        if (trigger > 0 && seconds > 0) {

            // add length-based-time ONCE
            if (!added) {
                setSeconds((seconds) => seconds + trigger);
                setAdded(true);
            }

            // extra button disables for lower ranked players
            if (equityDisables.includes(seconds)) {
                disableRandomButton();
            }

            // below 5 seconds play a clock tick sound effect to remind player to guess
            if (seconds <= 5) {
                tick.play();
            }

            // decrement timer
            const interval = setInterval(() => {
                setSeconds((seconds) => seconds - 1);
            }, 1000);
            return () => clearInterval(interval);
        } 
        // if timer expires and player did not guess
        else if (trigger > 0 && seconds === 0 && myGuess === "") {
            trigger = 0;
            setSeconds(10);
            // tell the server to guess "-----" instead of a name
            guess("-----");
            // added isnt set to false here, so the timer will not add length-based-time next round
        } 
        // when round is over and player guessed during the round
        else if (trigger <= 0 && (seconds !== 10 || myGuess !== "-----")) {
            setSeconds(10 + (position * 5));
            setAdded(false);
        }

    }, [trigger, seconds]);

    if (status === "during"){
        return <div>{seconds} seconds remaining</div>;
    }
}

export default Timer;