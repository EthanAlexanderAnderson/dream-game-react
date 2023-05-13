import React from "react";

function PlayerSection(props) {

    // TODO: clean this mess
    let playerSection = [];
    for (let i = 0; i < props.scores.length; i++) {
        for (let j = 0; j < props.stats.length; j++) {
            if (props.scores[i][1] === props.stats[j][0]){
                let correct  = parseInt(props.stats[j][1]);
                let incorrect = parseInt(props.stats[j][2]);
                let ratio = ((correct/(incorrect+correct+0.001))*100).toFixed(2);
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
                <table className="table">
                    <thead>
                        <tr>
                            <th scope="col">Player</th>
                            <th scope="col">Scores</th>
                            <th scope="col">{colThree}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {playerSection.map((item) => {
                            // show score (default)
                            let itemThree = item[3];
                            if (props.status === "after") {
                                // show status
                                itemThree = item[4];
                            } else if (props.status === "before") {
                                // show skill rating
                                itemThree = item[5];
                            }
                            return (
                            <tr scope="row">
                                <td>{item[1]}</td>
                                <td>{item[2]}</td>
                                <td>{itemThree}</td>
                            </tr>
                            );
                        })}
                    </tbody>
                </table>
            );
        } else {
            return(<p>ERROR: SCORES NOT ARRAY</p>);
        }
    }
};
export default PlayerSection;