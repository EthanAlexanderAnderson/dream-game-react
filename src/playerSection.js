import React from "react";

function PlayerSection(props) {
    if (!(props.name === "")){
        if (Array.isArray(props.scores)) {   
            return (
                <table className="table">
                    <thead>
                        <tr>
                            <th scope="col">Player</th>
                            <th scope="col">Scores</th>
                        </tr>
                    </thead>
                    <tbody>
                        {props.scores.map((item) => {
                            return (
                            <tr scope="row">
                                <td>{item[1]}</td>
                                <td>{item[2]}</td>
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