import React, { useState, useEffect } from 'react';

var previousGuess = "null";

function Timer({ trigger, guess, myGuess, status, disableRandomButton, position, difficulty, rank, score, averageScore, tick }) {
    const [seconds, setSeconds] = useState(0);

    if (myGuess !== "") { previousGuess = myGuess; }

    var baseTime = 10;
    var maxTime = previousGuess === "-----" ? baseTime : baseTime + trigger; // only add time if the previous guess was not "-----" (aka didn't time out)

    let hintsArray = [];
    let numberOfHints = 0;
    let scoreBasedHints = 0;
    let rankBasedHints = 0;
    let positionBasedHints = 0;

    //console.log("position: " + position + " difficulty: " + difficulty + " rank: " + rank + " score: " + score + " averageScore: " + averageScore);
    if (score >= 0 && averageScore > 10) {
        scoreBasedHints = Math.floor((averageScore - score)/(averageScore/10));
    }
    if (averageScore > 2) {
        positionBasedHints = position;
    }
    rankBasedHints = Math.floor(difficulty-rank);
    numberOfHints = Math.max(0, positionBasedHints, rankBasedHints, scoreBasedHints)
    //console.log("hints: " + numberOfHints + " positionBasedHints: " + positionBasedHints + " rankBasedHints: " + rankBasedHints + " scoreBasedHints: " + scoreBasedHints);
    // disable buttons at percentage of timer intervals (no disables after 80% of timer to discourage stalling) maximum 8 hints
    // if the inital time is over 75 seconds, just use 75 so they don't wait over a minute for all hints
    let initialTime = Math.min(75, maxTime);
    for (let i = 0; i < numberOfHints; i++) {
        let secondsAfterInitalTime = Math.floor(initialTime * (0.1 * (i + 1))); // 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8
        hintsArray.push(initialTime - secondsAfterInitalTime);
        if ( i >= 7) { break; }
    }
    //console.log(hintsArray);

    useEffect(() => {
        // if timer is running
        if (trigger > 0 && seconds < maxTime && status === "during") {

            // extra button disables for lower ranked players
            if (hintsArray.includes(maxTime-seconds)) {
                disableRandomButton();
            }

            // below 5 seconds play a clock tick sound effect to remind player to guess
            if ((maxTime-seconds) <= 5) {
                tick.play();
            }

            // decrement timer
            const interval = setInterval(() => {
                setSeconds((seconds) => seconds + 1);
            }, 1000);
            return () => clearInterval(interval);
        } 
        else if (seconds === maxTime || trigger === 0) {
            setSeconds(0);
            if (myGuess === "" && status === "during") {
                guess("-----");
                previousGuess = "-----";
            }
        }

    }, [trigger, seconds]);

    if (status === "during"){
        return <div>{maxTime-seconds} seconds remaining</div>;
    }
}

export default Timer;