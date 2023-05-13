import React from "react";

function PlayerSection(props) {
    if (!(props.name === "")){
        if (Array.isArray(props.scores)) {
            props.scores.sort((a, b) => b[2] - a[2]); 
            return (
                <table className="table" style={{color: "#EEEEEE"}}>
                    <thead>
                        <tr>
                            <th scope="col">Player</th>
                            <th scope="col">Scores</th>
                            <th scope="col">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {props.scores.map((item) => {
                            return (
                            <tr scope="row">
                                <td>{item[1]}</td>
                                <td>{item[2]}</td>
                                <td>{item[3]}</td>
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