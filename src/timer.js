import React, { useState, useEffect } from 'react';

function Timer({ name, stats, difficulty, initialSeconds, timerIsRunning, guess, myGuess, status, disableRandomButton, position, tick }) {
    const [seconds, setSeconds] = useState(initialSeconds);
    var [addedInitialSeconds, setAddedInitialSeconds] = useState(false);

    var rank = -999;
    // find the rank of the local player, from the stats array
    for (let i = 0; i < stats.length; i++) {
        if (stats[i][0] === name) {
            rank = stats[i][7];
        }
    }
    var lowRankEquity = 0;
    // for players with a lower rank than the current dream difficulty, disable more buttons
    if (difficulty > rank) {
        lowRankEquity = Math.floor((difficulty - rank) / 3);
    }

    let equityDisables = [];
    for (let i = 0; i < (position + lowRankEquity); i++) {
        equityDisables.push((10 + (position * 5)) - ((i+1) * 2));
    }

    if ((position + lowRankEquity) > 0) {
        console.log("equityDisables: " + (position + lowRankEquity));
        console.log(equityDisables);
    }

    useEffect(() => {
        // increment timer
        if (timerIsRunning && seconds > 0) {

            if(!addedInitialSeconds){
                setAddedInitialSeconds(true);
                setSeconds(initialSeconds + 10 + (position * 5));
                console.log("initialSeconds: " + initialSeconds);
            }

            /*/ disable buttons
            if (seconds && (seconds & (seconds - 1)) === 0) {
                disableRandomButton();
            }*/
            // extra button disables for lower ranked players
            if (equityDisables.includes(seconds)) {
                disableRandomButton();
            }

            if (seconds <= 5) {
                tick.play();
            }

            const interval = setInterval(() => {
                setSeconds((seconds) => seconds - 1);
            }, 1000);
            return () => clearInterval(interval);

        } 
        // if timer expires and player did not guess
        else if (timerIsRunning && seconds === 0 && myGuess === "") {
            timerIsRunning = false;
            setSeconds(10);
            guess("-----")
        }
        // when round is over and player guessed during the round
        else if (!timerIsRunning && (seconds !== 10 || myGuess !== "-----")) {
            setAddedInitialSeconds(false);
            setSeconds(999); // don't think this matters, as long as not zero
        }

    }, [timerIsRunning, seconds]);

    if (status === "during"){
        return <div>{seconds} seconds remaining</div>;
    }
}

export default Timer;