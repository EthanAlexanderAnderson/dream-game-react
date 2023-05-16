import React, { memo } from "react";

function ProfileSection(props) {

    let stats = [];
    let labels = ["Name: ", "Skill Rating: ", "Correct: ", "Incorrect: ", "Ratio: ", "Longest Streak: ", "Memory: ", "Gnome Count: "]

    for (let i = 0; i < props.stats.length; i++) {
        if (props.stats[i][0] === props.name){
            
            let correct  = parseInt(props.stats[i][1]);
            let incorrect = parseInt(props.stats[i][2]);
            let ratio = ((correct/(incorrect+correct+0.001))*100).toFixed(2);
            let longestStreak = parseInt(props.stats[i][3]);
            let skillRating = (ratio * ((correct/10) + longestStreak)).toFixed(0);
            let correctMemory  = parseInt(props.stats[i][5]);
            let incorrectMemory = parseInt(props.stats[i][6]);
            let memory = ((correctMemory/(correctMemory+incorrectMemory+0.001))*100).toFixed(2);

            stats.push(props.stats[i][0]);// name
            stats.push(skillRating);
            stats.push(correct);
            stats.push(incorrect);
            stats.push(ratio+"%");
            stats.push(longestStreak);
            stats.push(memory+"%");
            stats.push(props.stats[i][4]); //
        }
    }

    if (props.name !== "") {
        return (
            <div id="profileSection" className='col-sm-3 order-3'>
                {stats.map((item, index) => (
                    <li key={index} className={"mod"+index%2}>{labels[index]}{item}</li>
                ))}
            </div>
        );
        }
};
export default ProfileSection;