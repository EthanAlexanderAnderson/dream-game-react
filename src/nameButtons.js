import React from "react";

function NameButtons(props) {
    if (props.name.length === 0 ){
        return (
            <div id="NameButtons">
                <button onClick={() => props.playerJoin("Ethan")}>Ethan</button>
                <button onClick={() => props.playerJoin("Cole")}>Cole</button>
                <button onClick={() => props.playerJoin("Nathan")}>Nathan</button>
                <button onClick={() => props.playerJoin("Oobie")}>Oobie</button>
                <button onClick={() => props.playerJoin("Devon")}>Devon</button>
                <button onClick={() => props.playerJoin("Max")}>Max</button>
                <button onClick={() => props.playerJoin("Mitch")}>Mitch</button>
                <button onClick={() => props.playerJoin("Adam")}>Adam</button>
                <button onClick={() => props.playerJoin("Eric")}>Eric</button>
                <button onClick={() => props.playerJoin("Dylan")}>Dylan</button>
                <button onClick={() => props.playerJoin("Jack")}>Jack</button>
                <button onClick={() => props.playerJoin("Devo")}>Devo</button>
                <button onClick={() => props.playerJoin("Zach")}>Zach</button>
            </div>
        );
    } else if (props.status === "during") {
        return(
            <div id="GuessButtons">
                <button onClick={() => props.guess("Ethan")}>Ethan</button>
                <button onClick={() => props.guess("Cole")}>Cole</button>
                <button onClick={() => props.guess("Nathan")}>Nathan</button>
                <button onClick={() => props.guess("Oobie")}>Oobie</button>
                <button onClick={() => props.guess("Devon")}>Devon</button>
                <button onClick={() => props.guess("Max")}>Max</button>
                <button onClick={() => props.guess("Mitch")}>Mitch</button>
                <button onClick={() => props.guess("Adam")}>Adam</button>
                <button onClick={() => props.guess("Eric")}>Eric</button>
                <button onClick={() => props.guess("Dylan")}>Dylan</button>
                <button onClick={() => props.guess("Jack")}>Jack</button>
                <button onClick={() => props.guess("Devo")}>Devo</button>
                <button onClick={() => props.guess("Zach")}>Zach</button>
            </div>
        );
    } 
    else {
        return(
            <div id="ControlButtons">
                <button onClick={() => props.start()}>Start</button>
            </div>
        );
    }
}

export default NameButtons;