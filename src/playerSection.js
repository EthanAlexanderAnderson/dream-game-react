import React from "react";

function PlayerSection(props) {

    // TODO: clean this mess
    let playerSection = [];
    for (let i = 0; i < props.scores.length; i++) {
        for (let j = 0; j < props.stats.length; j++) {
            if (props.scores[i][1] === props.stats[j][0]){
                let correct  = parseInt(props.stats[j][1]);
                let incorrect = parseInt(props.stats[j][2]);
                let ratio = ((correct/(incorrect+correct+0.00001))*100).toFixed(2);
                let longestStreak = parseInt(props.stats[j][3]);
                let skillRating = (ratio * ((correct/10) + longestStreak)).toFixed(0);
                let temp = props.scores[i];
                temp[5] = skillRating;
                playerSection.push(temp);
            }
        }
    }

    let colThree = "";
    if (props.status === "before") {
        colThree = "Skill Rating"
        // sort by skill rating
        playerSection.sort((a, b) => b[5] - a[5]);
    } else if (props.status === "during") {
        colThree = "Status"
        // sort by score
        playerSection.sort((a, b) => b[2] - a[2]);
    } else if (props.status === "after") {
        colThree = "Guessed"
        // sort by score
        playerSection.sort((a, b) => b[2] - a[2]);
    } else {
        colThree = "Status"
    }

    if (!(props.name === "")){
        if (Array.isArray(playerSection)) { 
            return (
                <div id="playerSection">
                    <table className="table">
                        <thead>
                            <tr key="Header Row">
                                <th key="Player" scope="col">Player</th>
                                <th key={"Scores"} scope="col">Scores</th>
                                <th key={colThree} scope="col">{colThree}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {playerSection.map((item, index) => {
                                // show ready (default)
                                let itemThree = item[3];
                                let scoreDiff = "";
                                let bonusArray = "";
                                if (props.status === "after") {
                                    // show guess
                                    itemThree = item[4];
                                    // set score and bonus info
                                    scoreDiff = ((item[2] - item[6]) !== 0) ? <span className="scoreDiff">+{item[2] - item[6]}</span> : null
                                    bonusArray = item[7].map((bonus, index) => <div key={bonus[0]+item[1]} className="bonus">{bonus[0]} +{bonus[1]}</div>)
                                } else if (props.status === "before") {
                                    // show skill rating
                                    itemThree = item[5];
                                }

                                return (
                                <tr key={item[1] + "Row"}>
                                    <td key={item[1] + "name"}>{item[1]}</td>
                                    <td key={item[1] + "score"}>{item[2]} {scoreDiff} {bonusArray}</td>
                                    <td key={item[1] + colThree }>{itemThree}</td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            );
        } else {
            return(<p>ERROR: SCORES NOT ARRAY</p>);
        }
    }
};
export default PlayerSection;