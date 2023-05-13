import React from "react";

function PlayerSection(props) {

    let colThree = "";
    if (props.status === "CHANGE THIS VALUE TO 'before' WHEN STATS ADDED") {
        colThree = "Elo"
    } else if (props.status === "during") {
        colThree = "Status"
    } else if (props.status === "after") {
        colThree = "Guessed"
    } else {
        colThree = "Status"
    }

    if (!(props.name === "")){
        if (Array.isArray(props.scores)) {
            props.scores.sort((a, b) => b[2] - a[2]); 
            return (
                <table className="table" style={{color: "#EEEEEE"}}>
                    <thead>
                        <tr>
                            <th scope="col">Player</th>
                            <th scope="col">Scores</th>
                            <th scope="col">{colThree}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {props.scores.map((item) => {
                            let itemThree = item[3];
                            if (props.status === "after") {
                                itemThree = item[4];
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