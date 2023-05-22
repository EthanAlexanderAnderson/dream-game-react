import React from "react";

function ButtonSection(props) {
    if (props.name === "" ){
        return (
            <div id="buttonSection">
                <p>Welcome to Dream Game. Please select your name:</p>
                <button className="btn btn-primary guessButton" onClick={() => props.playerJoin("Ethan")}>Ethan</button>
                <button className="btn btn-primary guessButton" onClick={() => props.playerJoin("Cole")}>Cole</button>
                <button className="btn btn-primary guessButton" onClick={() => props.playerJoin("Nathan")}>Nathan</button>
                <button className="btn btn-primary guessButton" onClick={() => props.playerJoin("Oobie")}>Oobie</button>
                <button className="btn btn-primary guessButton" onClick={() => props.playerJoin("Devon")}>Devon</button>
                <button className="btn btn-primary guessButton" onClick={() => props.playerJoin("Max")}>Max</button>
                <button className="btn btn-primary guessButton" onClick={() => props.playerJoin("Mitch")}>Mitch</button>
                <button className="btn btn-primary guessButton" onClick={() => props.playerJoin("Adam")}>Adam</button>
                <button className="btn btn-primary guessButton" onClick={() => props.playerJoin("Eric")}>Eric</button>
                <button className="btn btn-primary guessButton" onClick={() => props.playerJoin("Dylan")}>Dylan</button>
                <button className="btn btn-primary guessButton" onClick={() => props.playerJoin("Jack")}>Jack</button>
                <button className="btn btn-primary guessButton" onClick={() => props.playerJoin("Devo")}>Devo</button>
                <button className="btn btn-primary guessButton" onClick={() => props.playerJoin("Zach")}>Zach</button>
            </div>
        );
    } else if (props.status === "during") {
        return(
            <div id="guessButtons">
                <button className="btn btn-primary guessButton" onClick={() => props.guess("Ethan")}>Ethan</button>
                <button className="btn btn-primary guessButton" onClick={() => props.guess("Cole")}>Cole</button>
                <button className="btn btn-primary guessButton" onClick={() => props.guess("Nathan")}>Nathan</button>
                <button className="btn btn-primary guessButton" onClick={() => props.guess("Oobie")}>Oobie</button>
                <button className="btn btn-primary guessButton" onClick={() => props.guess("Devon")}>Devon</button>
                <button className="btn btn-primary guessButton" onClick={() => props.guess("Max")}>Max</button>
                <button className="btn btn-primary guessButton" onClick={() => props.guess("Mitch")}>Mitch</button>
                <button className="btn btn-primary guessButton" onClick={() => props.guess("Adam")}>Adam</button>
                <button className="btn btn-primary guessButton" onClick={() => props.guess("Eric")}>Eric</button>
                <button className="btn btn-primary guessButton" onClick={() => props.guess("Dylan")}>Dylan</button>
                <button className="btn btn-primary guessButton" onClick={() => props.guess("Jack")}>Jack</button>
                <button className="btn btn-primary guessButton" onClick={() => props.guess("Devo")}>Devo</button>
                <button className="btn btn-primary guessButton" onClick={() => props.guess("Zach")}>Zach</button>
            </div>
        );
    }  else if (props.status === "guessed") {
        return(
            <div>
                <p>Waiting for others to guess...</p>
            </div>
        );
    }
    else if (props.status === "before") {
        return(
            <div id="controlButtons">
                <button className="btn btn-light" onClick={() => props.start()}>Start</button>
            </div>
        );
    }
}

export default ButtonSection;