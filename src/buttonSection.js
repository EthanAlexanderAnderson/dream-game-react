import React from "react";
import { useState} from "react";

function ButtonSection({ name, setStatus, playerJoin, status, start, guess, disabled, toggleGnome, gnomeButtonStatus }) {
    let names = ["Ethan", "Cole", "Nathan", "Oobie", "Devon", "Mitch", "Max", "Adam", "Eric", "Dylan", "Jack", "Devo", "Zach"]
    let classes = []

    let j = 0;
    for (let i = 0; i < 13; i++) {
        if (disabled.length > 0 && i === disabled[j]) {
            //disabled.includes  should go here
            classes.push("btn btn-danger guessButton disabled")
            j++;
        } else {
            classes.push("btn btn-primary guessButton")
        }
    }

    const [message, setMessage] = useState('');
    const handleChange = event => {
        if (event.target.value === "silly" || event.target.value === "Silly"){
            setStatus("before");
        }
        setMessage(event.target.value);
    };

    if (name === "" && status !== "password"){
        return (
            <div id="buttonSection">
                <p>Welcome to Dream Game. Please select your name:</p>
                {names.map((item, index) => (
                    <button key={index} className={classes[index]} onClick={() => playerJoin(item)}>{item}</button>
                ))}
            </div>
        );
    } else if (status === "during") {
        return(
            <div id="guessButtons">
                {names.map((item, index) => (
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
                <button className="btn btn-light" onClick={() => start()}>Start</button>
                <br></br>
                <button className={gnomeButtonStatus ? 'btn gnome toggled' : 'btn gnome'} onClick={() => toggleGnome()}><img id="toggleGnome" src="gnome_256.png" alt="toggle gnome mode"></img></button>
            </div>
        );
    } 
    else if (name === "") {
        return(
            <div>
            <input
              id="message"
              name="message"
              type="text"
              placeholder="Password"
              onChange={handleChange}
              value={message}
            />
          </div>
        );
    }
}


export default ButtonSection;