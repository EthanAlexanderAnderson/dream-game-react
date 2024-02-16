import React from 'react';

function RankSection({ stats, PFPs }) {

    stats.sort((a, b) => b[7] - a[7]);

    return (
        <div id="ranks">
            <div className="accordion">
                <div className="accordion-item">    
                    <h2 className="accordion-header" id="ranksTableHeader">
                        <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#ranksTable" aria-expanded="true" aria-controls="collapseOne">
                            Ranks
                        </button>
                    </h2>
                    <div id="ranksTable" className="accordion-collapse collapse">
                        <table className="table">
                            <thead>
                                <tr key="Header Row">
                                    <th key="Player" scope="col" className='w-50'>Player</th>
                                    <th key="Skill Rating" scope="col" className='w-50'>Skill Rating</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.map((item) => { 
                                    let rank = [];
                                    if (item[7] !== undefined && item[7] !== null && item[7] !== "") {
                                        let rankcategory = "";
                                        // decide the rank category
                                        if (item[7] <= -3) {
                                            rankcategory = "coal";
                                        } else if (item[7] >= -2 && item[7] <= 0) { 
                                            rankcategory = "bronze";
                                        } else if (item[7] >= 1 && item[7] <= 3) {
                                            rankcategory = "silver";
                                        } else if (item[7] >= 4 && item[7] <= 6) {
                                            rankcategory = "gold";
                                        } else if (item[7] >= 7 && item[7] <= 9) {
                                            rankcategory = "emerald";
                                        } else if (item[7] >= 10 && item[7] <= 12) {
                                            rankcategory = "diamond";
                                        } else if (item[7] >= 13) {
                                            rankcategory = "omnipotent";
                                        }
                                        // this if is just a weird patch to fix the mod line in the next for loop
                                        let shouldbreak = false;
                                        if (item[7] <= 0) {
                                            if (item[7] <= -3) {
                                                shouldbreak = true
                                                item[7] += 99;
                                            }
                                            item[7] += 6;
                                        }
                                        // decide how many ticks to show
                                        for (let i = 0; i < ((item[7] - 1) % 3 + 1); i++) {
                                            rank[i] = <img key={item[1] + "rank" + i} className={`rank ${rankcategory}`} src="rank.png"></img>;
                                            // coal and omnipotent can onlt have 1 tick
                                            if (item[7] <= 0 || item[7] >= 13 || shouldbreak) {
                                                break;
                                            }
                                        }
                                    }
                                    return (
                                        <tr key={item[0] + "Row"}>
                                            <td key={item[0] + "name"}>{item[0]}</td>
                                            <td key={item[0] + "skillRating" }>{rank}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
export default RankSection;