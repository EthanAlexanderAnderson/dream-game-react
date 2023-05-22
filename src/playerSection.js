import React from "react";

function PlayerSection(props) {

    let name = props.name;
    let scores = props.scores;
    let stats = props.stats;
    let status = props.status;
    let PFPs = new Map();

    for (let j = 0; j < props.PFPs.length; j++) {
        PFPs.set(props.PFPs[j][0], props.PFPs[j][1]);
    }

    // TODO: clean this mess
    let playerSection = [];
    for (let i = 0; i < scores.length; i++) {
        for (let j = 0; j < stats.length; j++) {
            if (scores[i][1] === stats[j][0]){
                let correct  = parseInt(stats[j][1]);
                let incorrect = parseInt(stats[j][2]);
                let ratio = ((correct/(incorrect+correct+0.00001))*100).toFixed(2);
                let longestStreak = parseInt(stats[j][3]);
                let skillRating = (ratio * ((correct/10) + longestStreak)).toFixed(0);
                let temp = scores[i];
                temp[5] = skillRating;
                playerSection.push(temp);
            }
        }
    }

    let colThree = "";
    if (status === "before") {
        colThree = "Skill Rating"
        // sort by skill rating
        playerSection.sort((a, b) => b[5] - a[5]);
    } else if (status === "during") {
        colThree = "Status"
        // sort by score
        playerSection.sort((a, b) => b[2] - a[2]);
    } else if (status === "after") {
        colThree = "Guessed"
        // sort by score
        playerSection.sort((a, b) => b[2] - a[2]);
    } else {
        colThree = "Status"
    }

    //console.log(PFPs);

    if (!(name === "")){
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
                                if (status === "after") {
                                    // show guess
                                    itemThree = item[4];
                                    // set score and bonus info
                                    scoreDiff = ((item[2] - item[6]) !== 0) ? <span className="scoreDiff">+{item[2] - item[6]}</span> : null
                                    bonusArray = item[7].map((bonus, index) => <div key={bonus[0]+item[1]} className="bonus">{bonus[0]} +{bonus[1]}</div>)
                                } else if (status === "before") {
                                    // show skill rating
                                    itemThree = item[5];
                                }
                                return (
                                <tr key={item[1] + "Row"}>
                                    <td key={item[1] + "name"}><img className="PFP" src={PFPs.get(item[1])}></img>{item[1]}</td>
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