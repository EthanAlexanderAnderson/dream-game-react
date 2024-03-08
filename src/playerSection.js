import React from "react";

function PlayerSection(props) {

    // variable guide:
    // stats: [name, correct, incorrect, longestStreak, gnome count, memory corr, memory incor, rank, skillrating]
    // scores: [socket.id , name, score, status, guess, skillRating, prevScore, bonus array, rank]

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
                // if rank is undefined or null or empty string or NaN
                if (stats[j][7] === undefined || stats[j][7] === null || stats[j][7] === "" || isNaN(stats[j][7])) {
                    console.log("rank is undefined or null or empty string or NaN: " + stats[j][7] + " type: " + typeof stats[j][7]);
                }
                // if rank is a number, round
                if (typeof stats[j][7] === 'number') {
                    temp[8] = stats[j][7];
                } 
                // if not a number, try to parse and round
                else {
                    temp[8] = parseFloat(stats[j][7]);
                    if (isNaN(temp[8])) {
                        console.log(temp[1] + "'s rank is not a number: " + temp[8] + " type: " + typeof temp[8]);
                    }
                }
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

    if (name !== ""){
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
                                // items: [socket.id , name, score, status, guess, skillRating, prevScore, bonus array, rank]
                                // show ready (default)
                                let itemThree = item[3];
                                let scoreDiff = "";
                                let bonusArray = "";
                                if (status === "after") {
                                    // show guess
                                    itemThree = item[4];
                                    // set score and bonus info
                                    // score diff
                                    scoreDiff = ((item[2] - item[6]) > 0) ? <span className="scoreDiffPos">+{item[2] - item[6]}</span> : ((item[2] - item[6]) < 0) ? <span className="scoreDiffNeg">{item[2] - item[6]}</span> : null
                                    bonusArray = item[7].map((bonus, index) => <div key={bonus[0]+item[1]} className="bonus">{bonus[0]} +{bonus[1]}</div>)
                                } else if (status === "before") {
                                    // show skill rating
                                    itemThree = item[5];
                                }
                                let rank = [];
                                // rank
                                let unflooredRank = item[8];
                                item[8] = Math.floor(item[8]);
                                if (item[8] !== undefined && item[8] !== null && item[8] !== "") {
                                    let rankcategory = "";
                                    // decide the rank category
                                    if (item[8] <= -3) {
                                        rankcategory = "coal";
                                    } else if (item[8] >= -2 && item[8] <= 0) { 
                                        rankcategory = "bronze";
                                    } else if (item[8] >= 1 && item[8] <= 3) {
                                        rankcategory = "silver";
                                    } else if (item[8] >= 4 && item[8] <= 6) {
                                        rankcategory = "gold";
                                    } else if (item[8] >= 7 && item[8] <= 9) {
                                        rankcategory = "emerald";
                                    } else if (item[8] >= 10 && item[8] <= 12) {
                                        rankcategory = "diamond";
                                    } else if (item[8] >= 13) {
                                        rankcategory = "omnipotent";
                                    }
                                    // this if is just a weird patch to fix the mod line in the next for loop
                                    let shouldbreak = false;
                                    let modifier = 0;
                                    if (item[8] <= 0) {
                                        if (item[8] <= -3) {
                                            shouldbreak = true
                                            modifier = 99;
                                        }
                                        modifier = 6;
                                    }
                                    // decide how many ticks to show
                                    for (let i = 0; i < (((item[8] + modifier) - 1) % 3 + 1); i++) {
                                        rank[i] = <img key={item[1] + "rank" + i} className={`rank ${rankcategory}`} src="rank.png" alt='rank tick' title={unflooredRank}></img>;
                                        // coal and omnipotent can onlt have 1 tick
                                        if ((item[8] + modifier) <= 0 || (item[8] + modifier) >= 13 || shouldbreak) {
                                            break;
                                        }
                                    }
                                }

                                return (
                                <tr key={item[1] + "Row"}>
                                    <td key={item[1] + "name"}>
                                        {rank}
                                        <img className="PFP" src={PFPs.get(item[1])} alt='player'></img>
                                        {item[1]}
                                    </td>
                                    <td key={item[1] + "score"}>
                                        {item[2]} {scoreDiff} {bonusArray}
                                    </td>
                                    <td key={item[1] + colThree}>
                                        {itemThree}
                                    </td>
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