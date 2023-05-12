import React from "react";

function PlayerSection(props) {
    if (Array.isArray(props.scores)) {   
        return (
            <table class="table">
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
                            <td>{item[0]}</td>
                            <td>{item[1]}</td>
                        </tr>
                        );
                    })}
                </tbody>
            </table>
        );
    } else {
        return(<p>NOT ARRAY</p>);
    }
};
export default PlayerSection;