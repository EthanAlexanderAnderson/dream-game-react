import React from 'react';

function Leaderboard({ stats, PFPs }) {

    // TODO: add PFPs

    // calc skill rating and add to stats array
    for (let i = 0; i < stats.length; i++) {        
        let correct  = parseInt(stats[i][1]);
        let incorrect = parseInt(stats[i][2]);
        let ratio = ((correct/(incorrect+correct+0.00001))*100).toFixed(2);
        let longestStreak = parseInt(stats[i][3]);
        let skillRating = (ratio * ((correct/10) + longestStreak)).toFixed(0);
        stats[i][7] = skillRating;
    }

    stats.sort((a, b) => b[7] - a[7]);

    return (
        <div id="leaderboard">
            <div className="accordion">
                <div className="accordion-item">    
                    <h2 className="accordion-header" id="leaderboardTableHeader">
                        <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#leaderboardTable" aria-expanded="true" aria-controls="collapseOne">
                            Leaderboard
                        </button>
                    </h2>
                    <div id="leaderboardTable" className="accordion-collapse collapse">
                        <table className="table">
                            <thead>
                                <tr key="Header Row">
                                    <th key="Player" scope="col" className='w-50'>Player</th>
                                    <th key="Skill Rating" scope="col" className='w-50'>Skill Rating</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.map((item) => { 
                                    if (item[7] > 0) {
                                        return (
                                            <tr key={item[0] + "Row"}>
                                                <td key={item[0] + "name"}>{item[0]}</td>
                                                <td key={item[0] + "skillRating" }>{item[7]}</td>
                                            </tr>
                                        );
                                    }
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
export default Leaderboard;