import React from "react";

function NameButtons(props) {
    if (props.name.length === 0 ){
        return (
            <div id="NameButtons">
                <button onClick={() => props.playerJoin("Ethan")}>Ethan</button>
                <button onClick={() => props.playerJoin("Cole")}>Cole</button>
                <button onClick={() => props.playerJoin("Nathan")}>Nathan</button>
                <button onClick={() => props.playerJoin("Oobie")}>Oobie</button>
            </div>
        );
    } else if (props.status === "during") {
        return(
            <div id="GuessButtons">
                <button onClick={() => props.guess("Ethan")}>Ethan</button>
                <button onClick={() => props.guess("Cole")}>Cole</button>
                <button onClick={() => props.guess("Nathan")}>Nathan</button>
                <button onClick={() => props.guess("Oobie")}>Oobie</button>
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