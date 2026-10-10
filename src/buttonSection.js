import React from "react";

function ButtonSection({ name, setStatus, playerJoin, status, ready, guess, disabled, toggleGnome, gnomeButtonStatus }) {
    // These names correspond to the fixed player records loaded by the server.
    let profileNames = ["Ethan", "Cole", "Nathan", "Oobie", "Devon", "Mitch", "Max", "Adam", "Eric", "Dylan", "Jack", "Devo", "Zach", "Ailís", "Guest"]
    let guessNames = ["Ethan", "Cole", "Nathan", "Oobie", "Devon", "Mitch", "Max", "Adam", "Eric", "Dylan", "Jack", "Devo", "Zach"]
    let classes = []

    let j = 0;
    for (let i = 0; i < profileNames.length; i++) {
        if (disabled.length > 0 && i === disabled[j]) {
            //disabled.includes  should go here
            classes.push("btn btn-danger guessButton disabled")
            j++;
        } else {
            classes.push("btn btn-primary guessButton")
        }
    }

    if (name === ""){
        return (
            <div id="buttonSection">
                <p>Welcome to Dream Game. Please select your name:</p>
                {profileNames.map((item, index) => (
                    <button key={index} className={classes[index]} onClick={() => playerJoin(item)}>{item}</button>
                ))}
            </div>
        );
    } else if (status === "during") {
        return(
            <div id="guessButtons">
                {guessNames.map((item, index) => (
                    <button key={index} className={classes[index]} onClick={() => guess(item)}>{item}</button>
                ))}
            </div>
        );
    }  else if (status === "guessed") {
        return(
            <div>
                <p>Waiting for others to guess...</p>
            </div>
        );
    }
    else if (status === "before") {
        return(
            <div id="controlButtons">
                {/* Readiness is sent to the server; it starts the round when eligible. */}
                <button className="btn btn-light" onClick={() => ready()}>Ready</button>
                <br></br>
                <button className={gnomeButtonStatus ? 'btn gnome toggled' : 'btn gnome'} onClick={() => toggleGnome()}><img id="toggleGnome" src="gnome_256.png" alt="toggle gnome mode"></img></button>
            </div>
        );
    } 
}


export default ButtonSection;