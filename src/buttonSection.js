import React, { useState } from "react";
import GameSettings from "./gameSettings";

function ButtonSection({ name, playerJoin, status, ready, guess, disabled, settings, settingsOpen, toggleSettings, canEditSettings, saveSettings }) {
    const [settingsDirty, setSettingsDirty] = useState(false);
    // These names correspond to the fixed player records loaded by the server.
    let profileNames = ["Ethan", "Cole", "Nathan", "Oobie", "Devon", "Mitch", "Max", "Adam", "Eric", "Dylan", "Jack", "Devo", "Zach", "Ailís", "Guest"]
    let guessNames = ["Ethan", "Cole", "Nathan", "Oobie", "Devon", "Mitch", "Max", "Adam", "Eric", "Dylan", "Jack", "Devo", "Zach"]
    const enabledGuessNames = settings?.allowedDreamers
        ? guessNames.filter((guessName) => settings.allowedDreamers.includes(guessName))
        : guessNames;
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
            <>
                <div id="guessButtons">
                    {enabledGuessNames.map((item) => {
                        const index = guessNames.indexOf(item);
                        return (
                        <button key={item} className={classes[index]} onClick={() => guess(item)}>{item}</button>
                        );
                    })}
                </div>
                <GameSettings settings={settings} open={settingsOpen} canEdit={canEditSettings} onDirtyChange={setSettingsDirty} onToggle={toggleSettings} onSave={saveSettings} />
            </>
        );
    }  else if (status === "guessed") {
        return(
            <div>
                <p>Waiting for others to guess...</p>
                <GameSettings settings={settings} open={settingsOpen} canEdit={canEditSettings} onDirtyChange={setSettingsDirty} onToggle={toggleSettings} onSave={saveSettings} />
            </div>
        );
    }
    else if (status === "after") {
        return <GameSettings settings={settings} open={settingsOpen} canEdit={canEditSettings} onDirtyChange={setSettingsDirty} onToggle={toggleSettings} onSave={saveSettings} />;
    }
    else if (status === "before") {
        return(
            <div id="controlButtons">
                {/* Readiness is sent to the server; it starts the round when eligible. */}
                <button className="btn btn-light" onClick={() => ready()} disabled={settingsDirty}>Ready</button>
                <GameSettings settings={settings} open={settingsOpen} canEdit={canEditSettings} onDirtyChange={setSettingsDirty} onToggle={toggleSettings} onSave={saveSettings} />
            </div>
        );
    } 
}


export default ButtonSection;