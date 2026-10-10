import React, { useState, useEffect } from 'react';

var previousGuess = "null";

function Timer({ trigger, guess, myGuess, status, disableRandomButton, position, difficulty, rank, score, averageScore, tick, hintsEnabled = true, maxHints = 8 }) {
    const [seconds, setSeconds] = useState(0);

    if (myGuess !== "") { previousGuess = myGuess; }

    var baseTime = 10;
    // only add time if the previous guess was not "-----" (aka didn't time out)
    // this is so AFK players don't hold up the game
    var maxTime = previousGuess === "-----" ? baseTime : baseTime + trigger; 

    // players with lower scores, lower ranks, and lower positions will get more hints
    // a hint is a button with an incorrect answer that is disabled at a certain time in the timer
    let hintsArray = [];
    let numberOfHints = 0;
    let scoreBasedHints = 0;
    let rankBasedHints = 0;
    let positionBasedHints = 0;

    //console.log("position: " + position + " difficulty: " + difficulty + " rank: " + rank + " score: " + score + " averageScore: " + averageScore);
    // if the player has a score less than the average score, give them more hints based on how far below the average they are
    if (score >= 0 && averageScore > 10) {
        scoreBasedHints = Math.floor((averageScore - score)/(averageScore/10));
    }
    // players get hints based on their scoreboard position (1st place gets 0 hints, 2nd place gets 1 hint, etc.)
    if (averageScore > 2) {
        positionBasedHints = position;
    }
    // if the player has a rank lower than the current dream difficulty,
    // they get hints based on how far below the difficulty they are
    rankBasedHints = Math.ceil(difficulty-rank);
    numberOfHints = Math.max(0, positionBasedHints, rankBasedHints, scoreBasedHints)
    //console.log("hints: " + numberOfHints + " positionBasedHints: " + positionBasedHints + " rankBasedHints: " + rankBasedHints + " scoreBasedHints: " + scoreBasedHints);
    // disable buttons at percentage of timer intervals (no disables after 80% of timer to discourage stalling) maximum 8 hints
    // if the inital time is over 75 seconds, just use 75 so they don't wait over a minute for all hints
    let initialTime = Math.min(75, maxTime);
    for (let i = 0; hintsEnabled && i < numberOfHints && i < maxHints; i++) {
        let secondsAfterInitalTime = Math.floor(initialTime * (0.1 * (i + 1))); // 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8
        hintsArray.push(maxTime - secondsAfterInitalTime);
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