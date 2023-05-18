import React from "react";

function PlayerSection(props) {

    let records = props.records.filter(subarray => subarray[3] !== 'null');
    let status = props.status;
    let colThree = "";

    if (status === "before") {
        colThree = "Skill Rating"
        // sort by skill rating
        records.sort((a, b) => b[11] - a[11]);
    } else if (status === "during") {
        colThree = "Status"
        // sort by score
        records.sort((a, b) => b[1] - a[1]);
    } else if (status === "after") {
        colThree = "Guessed"
        // sort by score
        records.sort((a, b) => b[1] - a[1]);
    } else {
        colThree = "Status"
    }

    if (!(props.name === "")){
        if (Array.isArray(records)) { 
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
                            {records.map((item, index) => {
                                // show status (default)
                                //console.log(records);
                                let itemThree = item[3];
                                if (status === "after") {
                                    // show guessed
                                    itemThree = item[4];
                                } else if (status === "before") {
                                    // show skill rating
                                    itemThree = item[11];
                                }
                                return (
                                <tr key={item[0] + "Row"} scope="row">
                                    <td key={item[0] + "name"}>{item[0]}</td>
                                    <td key={item[0] + "score"}>{item[1]}</td>
                                    <td key={item[0] + colThree }>{itemThree}</td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            );
        } else {
            return(<p>ERROR: RECORDS NOT ARRAY</p>);
        }
    }
};
export default PlayerSection;