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
                                    <th key="Rank" scope="col" className='w-50'>Rank</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.map((item) => { 
                                    let rank = [];
                                    //console.log(item);
                                    if (item[7] !== undefined && item[7] !== null && item[7] !== "" && !isNaN(item[7])) {
                                        let rankStat;
                                        if (typeof item[7] === 'number') {
                                            //console.log(item[0] + "'s rank is a number: " + item[7] + ". rounding to: " + Math.floor(item[7]));
                                            rankStat = Math.floor(item[7]);

                                        } else {
                                            rankStat = Math.floor(parseFloat(item[7]));
                                            if (isNaN(rankStat)) {
                                                console.log(item[0] + "'s rank is not a number: " + item[7] + " type: " + typeof item[7]);
                                            }
                                            //console.log(item[0] + "'s rank is not a number: " + item[7] + " type: " + typeof item[7]);
                                        }
                                        let rankcategory = "";
                                        // decide the rank category
                                        if (rankStat <= -3) {
                                            rankcategory = "coal";
                                        } else if (rankStat >= -2 && rankStat <= 0) { 
                                            rankcategory = "bronze";
                                        } else if (rankStat >= 1 && rankStat <= 3) {
                                            rankcategory = "silver";
                                        } else if (rankStat >= 4 && rankStat <= 6) {
                                            rankcategory = "gold";
                                        } else if (rankStat >= 7 && rankStat <= 9) {
                                            rankcategory = "emerald";
                                        } else if (rankStat >= 10 && rankStat <= 12) {
                                            rankcategory = "diamond";
                                        } else if (rankStat >= 13) {
                                            rankcategory = "omnipotent";
                                        }
                                        // this if is just a weird patch to fix the mod line in the next for loop
                                        let shouldbreak = false;
                                        let modifier = 0;
                                        if (rankStat <= 0) {
                                            if (rankStat <= -3) {
                                                shouldbreak = true
                                                modifier = 99;
                                            }
                                            modifier = 6;
                                        }
                                        // decide how many ticks to show
                                        for (let i = 0; i < (((rankStat + modifier) - 1) % 3 + 1); i++) {
                                            rank[i] = <img key={item[1] + "rank" + i} className={`rank ${rankcategory}`} src="rank.png" alt='rank tick'></img>;
                                            // coal and omnipotent can onlt have 1 tick
                                            if ((rankStat + modifier) <= 0 || (rankStat + modifier) >= 13 || shouldbreak) {
                                                break;
                                            }
                                        }
                                    } else {
                                        console.log("rank is undefined or null or empty string or NaN: " + item[7] + " type: " + typeof item[7]);
                                    }
                                    return (
                                        <tr key={item[0] + "Row"}>
                                            <td key={item[0] + "name"}>{item[0]}</td>
                                            <td key={item[0] + "rank" }>{rank}</td>
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