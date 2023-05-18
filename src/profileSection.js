import React, { memo } from "react";

function ProfileSection(props) {

    let stats = [];
    let labels = ["Name: ", "Skill Rating: ", "Correct: ", "Incorrect: ", "Ratio: ", "Longest Streak: ", "Memory: ", "Gnome Count: "]

    for (let i = 0; i < props.records.length; i++) {
        if (props.records[i][0] === props.name){

            stats.push(props.records[i][0]);
            stats.push(props.records[i][11]);
            stats.push(props.records[i][5]);
            stats.push(props.records[i][6]);
            stats.push(props.records[i][12]+"%");
            stats.push(props.records[i][7]);
            stats.push(props.records[i][13]+"%");
            stats.push(props.records[i][8]);
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