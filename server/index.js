// ---------- Don't touch this section ----------
const dotenv = require("dotenv");
dotenv.config();
const Redis = require("ioredis");
const client = new Redis(process.env.REDIS_URL, {
    tls: {
        rejectUnauthorized: false
    }
});
const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
app.use(cors());
const server = http.createServer(app);
const path = require('path');
app.use(express.static(path.join(__dirname, '../build')));
app.get('/', (req, res, next) => res.sendFile(__dirname + './index.html'));

const io = new Server(server, {
    cors: {
      origin: ["http://localhost:3000", "https://dreamgame.herokuapp.com/", "http://www.ethananderson.ca/"], // FOR PROD
      methods: ["GET", "POST"],
    },
});

server.listen(process.env.PORT || 3001, () => {
    console.log("SERVER IS RUNNING");
});
// ---------- End of restricted section ----------

// dreamgame variables
let names = ["Ethan", "Cole", "Nathan", "Oobie", "Devon", "Mitch", "Max", "Adam", "Eric", "Dylan", "Jack", "Devo", "Zach", "Ailís", "Guest"]
let redisResult = "default_redisResult_value";
let playerCount = 0;
let guessCount = 0;
let scores = [];
let stats = []; // [ 0name , 1corr, 2incorr, 3longeststreak, 4gnomecount, 5memcorr, 6memincorr, 7rank ]
let difficulty = [];
let status = "before";
let bottomFeeder = {
    name: "",
    streak: 0
  };
let earlyBird = "";
let PFPs = [];
let gnome = false;
var gnomeChance = -1;
let roundNumber = 0;
let dreamCount = 0;

// receiving socket stuff goes in this func
io.on("connection", (socket) => {

    updateStats();

    socket.on("disconnect", () => {
        const name = scores.find(subarray => subarray[0] === socket.id);
        if (Array.isArray(name)) {console.log(`User Disconnected: ${socket.id} ${name[1]}`);}
        // only decrease playercount if the user had selected a name
        if (scores.some(item => item[0] === socket.id)){
            playerCount--;

            if (getReady(socket) === "Ready") {
                guessCount--;
            }

            // prevents bricking from mid-round leavers
            if (guessCount === playerCount && guessCount !== 0){
                console.log("server side all guessed: "+ redisResult);
                io.emit("all_guessed", redisResult);
                guessCount = 0;
                status = "after";
            }
        }        
        if (playerCount <= 0){
            playerCount = 0;
            gnome = false;
            gnomeChance = -1;
        }
        if (playerCount <= 0 || guessCount <= 0){
            guessCount = 0;
        }
        scores = scores.filter(subArr => !subArr.includes(socket.id));
        io.emit("update_scores", scores);
        console.log("Player Count: " + playerCount + " --- Guess Count: " + guessCount);
      });
  
    // After new player selects their name
    socket.on("player_join", (name) => {
        console.log(`User Connected: ${socket.id} ${name}`);
        //socket.broadcast.emit("update_players", name);
        if (!scores.some(item => item[1] === name)){
            // if no players connected when a player joins, reset round number
            if (playerCount === 0) {
                roundNumber = 0;
                // and load saved buffer
                loadBuffer();
            }
            playerCount++;
            // scores variable items: id, name, score, ready, guess, skillrating, scorePrev, bonus Array
            scores.push([socket.id, name, 0, "Waiting...", "null", 0, 0, []]);
            for (let s of stats) {
                if (s[0] === name) {
                    s.push(socket.id);
                    break;
                }
              }
        }
        console.log("Player Count: " + playerCount);
        io.emit("update_scores", scores);
        io.emit("toggle_gnome_button_status", gnome);
        updatePFPs();
    });

    // After new player selects their name
    socket.on("get_random_dream_u", (data) => {
        // this if statement with new/refresh stops mid-round joiners from triggering new dream
        if (!(status === "during")){
            updateRandomDream("new", socket);
            status = "during";
            setReady("all", "Waiting...");
            clearBonus();
            io.emit("update_scores", scores);
            if (gnome) {
                gnomeChance = Math.floor(Math.random() * 5);
            }
        } else {
            updateRandomDream("refresh", socket);
        }
    });

    socket.on("guess", (guess) => {
        // break if undefined
        if ( getName(socket) === undefined ) {
            return;
        }
        console.log("Guess #" + guessCount + "   Of:" + guess + "   From guesser: " + getName(socket));
        guessCount++;
        setReady(socket, "Ready");
        setGuess(socket, guess);
        scores = scores.map(subArr => subArr.map((el, i) => i === 6 && subArr[0] === socket.id ? subArr[2] : el)); // scorePrev
        io.emit("update_scores", scores);
        if (guessCount <= 1){
            earlyBird = getName(socket);
        }
        // if anyone guessed gnome, it means the gnome button exists, thus answer is gnome
        if (guess === "Gnome") {
            dreamer = "Gnome";
        }
        if (guessCount === playerCount){
            console.log("Server side all guessed. Dreamer: "+ dreamer);
            io.emit("all_guessed", dreamer);
            guessCount = 0;
            status = "after";

            // increment bottom feeder streak counter
            if (playerCount > 1) {
                let minSubarray = scores[0];
                let nextMinSubarray = scores[0];
                for (let i = 1; i < scores.length; i++) {
                    if (scores[i][2] < minSubarray[2]) {
                        minSubarray = scores[i];
                    }
                }
                for (let i = 1; i < scores.length; i++) {
                    if (scores[i][2] < nextMinSubarray[2] && scores[i][2] > minSubarray[2]) {
                        nextMinSubarray = scores[i];
                    }
                }
                // only increment streak if the bottom feeder is the same as last round and the new score is less than half of the next lowest score
                if (bottomFeeder.name === minSubarray[1] && minSubarray[2] < (nextMinSubarray[2] / 2)) {
                    bottomFeeder.streak++;
                } else {
                    bottomFeeder.name = minSubarray[1];
                    bottomFeeder.streak = 1;
                }
            }
        }
    });

    socket.on("send_message", (data) => {
        let message = data.message;
        let name = data.name;
        io.emit('receive_message', { message, name });
    });

    socket.on("correct", (name) => {
        
        let statindex = -1;
        let scoreindex = -1;
        let dreamerindex = -1;
        [statindex, scoreindex, dreamerindex] = setIndexes(name);

        if (scoreindex >= 0 && scoreindex < scores.length && scores[scoreindex][5] <= 0) {
            scores = scores.map(subArr => subArr.map((el, i) => i === 5 && subArr[0] === socket.id ? 0 : el)); // let negative streak to 0
        }
        scores = scores.map(subArr => subArr.map((el, i) => i === 5 && subArr[0] === socket.id ? parseInt(el) + 1 : el)); // increase streak
        scores = scores.map(subArr => subArr.map((el, i) => i === 2 && subArr[0] === socket.id ? parseInt(el) + 1 : el)); // score for correct guess

        // STATS
        // correct guesses stat
        stats = stats.map(subArr => subArr.map((el, i) => i === 1 && subArr[0] === name ? parseInt(el) + 1 : el));
        // longest streak stat
        if (parseInt(scores[scoreindex][5]) > parseInt(stats[statindex][3])) {
            stats = stats.map(subArr => subArr.map((el, i) => i === 3 && subArr[0] === name ? parseInt(stats[statindex][3]) + 1 : el));
        }
        // memory correct
        stats = stats.map(subArr => subArr.map((el, i) => i === 5 && subArr[0] === name && dreamer === name ? parseInt(el) + 1 : el));
        // correct rank evaluation
        let currentDreamDifficulty = difficulty[buffer[buffer.length-1]];
        if (typeof currentDreamDifficulty !== "number"){
            currentDreamDifficulty = parseFloat(difficulty[buffer[buffer.length-1]]).toFixed(2);
        }
        let SRo = stats[statindex][7];
        if (typeof SRo !== "number"){
            SRo = parseFloat(parseFloat(stats[statindex][7]).toFixed(2));
        }
        //console.log("SRn: "+ SRo + " + abs(" +  SRo + " - Math.max(" + SRo + ", " + currentDreamDifficulty + ") * 0.1 )");
        //console.log( "SRn: "+ (SRo + Math.abs( (SRo - Math.max(SRo, currentDreamDifficulty)) * 0.1 )) );
        let SRn = (SRo + Math.max(1, Math.abs(currentDreamDifficulty - SRo))**(Math.sign(currentDreamDifficulty - SRo)) * 0.1).toFixed(2);
        console.log(name + " SRo: " + SRo + "   -->   SRn: "+ SRn);
        stats = stats.map(subArr => subArr.map((el, i) => i === 7 && subArr[0] === name ? ((parseFloat(el)) + Math.max(1, Math.abs(currentDreamDifficulty - (parseFloat(el))))**(Math.sign(currentDreamDifficulty - (parseFloat(el)))) * 0.1).toFixed(2) : el));
        // wrap up stat stuff
        console.log(stats[statindex].join(", "));
        io.emit("update_stats", stats);
        let temp = []
        // remove socket id and/or name from database push
        if (stats[statindex][0] === name) {
            temp = stats[statindex].slice(1, 8)
        }
        // only push to database if the data is good (each value is a number, or a string representing a number)
        if (temp.every((el) => !isNaN(el) || !isNaN(parseFloat(el)))) {
            client.set(("%"+name),temp.join(","));
        } else {
            console.log("ERROR: stats data is not good: " + temp);
            // if data is bad, likely its due to rank being NaN, so revert it to SRo if it's a number
            if (!isNaN(stats[statindex][7]) || !isNaN(parseFloat(stats[statindex][7]))){
                stats = stats.map(subArr => subArr.map((el, i) => i === 7 && subArr[0] === name ? SRo : el));
            }
        }

        // BONUSES
        // underdog bonus 
        let underdogData = scores.sort((a, b) => b[2] - a[2]);
        let underdogCount = 0;
        for (let i = 0; i < underdogData.length; i++) {
            if ( underdogData[i][4] !== dreamer ) {
                underdogCount++;
            } else{
                break;
            }
        }
        if (underdogCount > 0 && playerCount > 2) {
            scores = scores.map(subArr => subArr.map((el, i) => i === 2 && subArr[0] === socket.id ? (parseInt(el) + underdogCount) : el));
            scores = scores.map(subArr => subArr.map((el, i) => i === 7 && subArr[0] === socket.id ? el.concat([["Underdog x"+underdogCount, underdogCount]]) : el));
        }
        // streak bonus
        // if undefined, set 0
        if (scores[scoreindex] === undefined || scores[scoreindex] === null) {
            scores[scoreindex] = [socket.id, name, 0, "Waiting...", "null", 0, 0, [], 0];
        }
        if (scores[scoreindex] && (scores[scoreindex][5] === undefined || scores[scoreindex][5] === null)) {
            scores = scores.map(subArr => subArr.map((el, i) => i === 5 && subArr[0] === socket.id ? 0 : el));
        }
        if (scores[scoreindex][5] >= 5) {
            scores = scores.map(subArr => subArr.map((el, i) => i === 2 && subArr[0] === socket.id ? (parseInt(el) + (Math.floor(parseInt(scores[scoreindex][5])/5))) : el));
            scores = scores.map(subArr => subArr.map((el, i) => i === 7 && subArr[0] === socket.id ? el.concat([["Streak x"+scores[scoreindex][5], (Math.floor(parseInt(scores[scoreindex][5])/5))]]) : el));
        }
        // bottom feeder bonus
        if (name === bottomFeeder.name && (bottomFeeder.streak % 5 == 0) && playerCount > 1){
            scores = scores.map(subArr => subArr.map((el, i) => i === 2 && subArr[0] === socket.id ? (parseInt(el) + (Math.floor(parseInt(bottomFeeder.streak)/5))) : el));
            scores = scores.map(subArr => subArr.map((el, i) => i === 7 && subArr[0] === socket.id ? el.concat([["Bottom Feeder", (Math.floor(parseInt(bottomFeeder.streak)/5))]]) : el));
        }
        // early bird bonus
        if (name === earlyBird && playerCount > 2) {
            scores = scores.map(subArr => subArr.map((el, i) => i === 2 && subArr[0] === socket.id ? (parseInt(el) + 1) : el));
            scores = scores.map(subArr => subArr.map((el, i) => i === 7 && subArr[0] === socket.id ? el.concat([["Early Bird", 1]]) : el));
        }
        // irony bonus 
        // theres a bug here whhen the dreamer moves in the leaderboard before this point, irony is assigned not properly
        // we just need to reassign dreamerindex to the new position of the dreamer
        [statindex, scoreindex, dreamerindex] = setIndexes(name);
        if (scores[scoreindex][5] >= 1 && dreamerindex != -1 && scores[dreamerindex][4] !== dreamer) {
            scores = scores.map(subArr => subArr.map((el, i) => i === 2 && subArr[0] === socket.id ? (parseInt(el) + 1) : el));
            scores = scores.map(subArr => subArr.map((el, i) => i === 7 && subArr[0] === socket.id ? el.concat([["Irony", 1]]) : el));
        }
        // lone wolf bonus
        if (scores.every(subArr => subArr[4] !== dreamer || subArr[0] === socket.id) && playerCount > 2) {
            scores = scores.map(subArr => subArr.map((el, i) => i === 2 && subArr[0] === socket.id ? (parseInt(el) + 1) : el));
            scores = scores.map(subArr => subArr.map((el, i) => i === 7 && subArr[0] === socket.id ? el.concat([["Lone Wolf", 1]]) : el));
        // Non-conformist & Mixed Bag bonus
            if (playerCount > 3){
                let unique = [];
                for (let i = 0; i < scores.length; i++) {
                    if (!unique.includes(scores[i][4])) {
                        unique.push(scores[i][4]);
                    }
                }
                // Non-conformist bonus
                if (unique.length == 2) {
                    scores = scores.map(subArr => subArr.map((el, i) => i === 2 && subArr[0] === socket.id ? (parseInt(el) + (playerCount-3)) : el));
                    scores = scores.map(subArr => subArr.map((el, i) => i === 7 && subArr[0] === socket.id ? el.concat([["Non-conformist", (playerCount-3)]]) : el));
                } 
                // Mixed Bag bonus
                else if (unique.length == playerCount) {
                    scores = scores.map(subArr => subArr.map((el, i) => i === 2 && subArr[0] === socket.id ? (parseInt(el) + (playerCount-3)) : el));
                    scores = scores.map(subArr => subArr.map((el, i) => i === 7 && subArr[0] === socket.id ? el.concat([["Mixed Bag", (playerCount-3)]]) : el));
                }
            }
        }

        // DIFFICULTY
        // TODO change this to use rank formula after testing non-int dream difficulties
        difficulty[buffer[buffer.length-1]]--;
        // make sure the dream we just changed is a valid number and between -5 and 15
        if (difficulty[buffer[buffer.length-1]] >= -5 && difficulty[buffer[buffer.length-1]] <= 15) {
            client.set(("%difficulty"),difficulty.join(","));
        } else {
            console.log("ERROR: difficulty is not between -5 and 15: " + difficulty[buffer[buffer.length-1]]);
            if (difficulty[buffer[buffer.length-1]] < -5){
                difficulty[buffer[buffer.length-1]] = -5;
            } else if (difficulty[buffer[buffer.length-1]] > 15){
                difficulty[buffer[buffer.length-1]] = 15;
            } else {
                console.log("ERROR: difficulty is not a number: " + difficulty[buffer[buffer.length-1]] + ". Setting to 5.");
                difficulty[buffer[buffer.length-1]] = 5;
            }
        }
        io.emit("update_scores", scores);
    });

    socket.on("incorrect", (name) => {
        let statindex = -1;
        let scoreindex = -1;
        let dreamerindex = -1;
        [statindex, scoreindex, dreamerindex] = setIndexes(name);
        // STATS
        // incorrect guesses stat
        stats = stats.map(subArr => subArr.map((el, i) => i === 2 && subArr[0] === name ? parseInt(el) + 1 : el));
        // memory incorrect
        stats = stats.map(subArr => subArr.map((el, i) => i === 6 && subArr[0] === name && dreamer === name ? parseInt(el) + 1 : el));
        // gnome count and score decrease
        if ( dreamer === "Gnome" ) {
            stats = stats.map(subArr => subArr.map((el, i) => i === 4 && subArr[0] === name ? parseInt(el) + 1 : el));
            scores = scores.map(subArr => subArr.map((el, i) => i === 2 && subArr[0] === socket.id ? parseInt(el) - 10 : el));
        }
        // incorrect rank evaluation
        let currentDreamDifficulty = difficulty[buffer[buffer.length-1]];
        if (typeof currentDreamDifficulty !== "number"){
            currentDreamDifficulty = parseFloat(difficulty[buffer[buffer.length-1]]).toFixed(2);
        }
        let SRo = stats[statindex][7];
        if (typeof SRo !== "number"){
            SRo = parseFloat(parseFloat(stats[statindex][7]).toFixed(2));
        }
        //console.log("SRn: "+ SRo + " - abs(" +  SRo + " - Math.min(" + SRo + ", " + currentDreamDifficulty + ") * 0.1 )");
        //console.log("SRn: "+ (SRo - Math.abs( SRo - Math.min(SRo, currentDreamDifficulty)) * 0.1 ));
        let SRn = (SRo - Math.max(1, Math.abs(currentDreamDifficulty - SRo))**(-Math.sign(currentDreamDifficulty - SRo)) * 0.1).toFixed(2);
        console.log(name + " SRo: " + SRo + "   -->   SRn: " + SRn);
        stats = stats.map(subArr => subArr.map((el, i) => i === 7 && subArr[0] === name ? ((parseFloat(el)) - Math.max(1, Math.abs(currentDreamDifficulty - (parseFloat(el))))**(-Math.sign(currentDreamDifficulty - (parseFloat(el)))) * 0.1).toFixed(2) : el));
        console.log(stats[statindex].join(", "));
        io.emit("update_stats", stats);

        // BONUSES
        // if undefined, set 0
        if (scores[scoreindex] === undefined || scores[scoreindex] === null) {
            scores[scoreindex] = [socket.id, name, 0, "Waiting...", "null", 0, 0, [], 0];
        }
        if (scores[scoreindex] && (scores[scoreindex][5] === undefined || scores[scoreindex][5] === null)) {
            scores = scores.map(subArr => subArr.map((el, i) => i === 5 && subArr[0] === socket.id ? 0 : el));
        }
        // reset streak
        if (scores[scoreindex][5] > 0) {
            if (scores[scoreindex][5] >= 5) {
        // streak breaker bonus
                scores = scores.map(subArr => subArr.map((el, i) => i === 2 && subArr[4] === dreamer ? (parseInt(el) + (Math.floor(parseInt(scores[scoreindex][5])/5))) : el));
                scores = scores.map(subArr => subArr.map((el, i) => i === 7 && subArr[4] === dreamer ? el.concat([["Streak Breaker", (Math.floor(parseInt(scores[scoreindex][5])/5))]]) : el));
            }
            scores = scores.map(subArr => subArr.map((el, i) => i === 5 && subArr[0] === socket.id ? 0 : el)); // reset streak to 0
        } else {
            scores = scores.map(subArr => subArr.map((el, i) => i === 5 && subArr[0] === socket.id ? (parseInt(el) - 1) : el)); // streak
            if (scoreindex >= 0 && scoreindex < scores.length && scores[scoreindex][5] <= -5) {
        // biggest loser bonus
                scores = scores.map(subArr => subArr.map((el, i) => i === 2 && subArr[0] === socket.id ? (parseInt(el) + 1) : el));
                scores = scores.map(subArr => subArr.map((el, i) => i === 5 && subArr[0] === socket.id ? 0 : el)); // reset streak to 0
                scores = scores.map(subArr => subArr.map((el, i) => i === 7 && subArr[0] === socket.id ? el.concat([["Biggest Loser", 1]]) : el));
            }
        }
        // bottom feeder bonus
        if (name === bottomFeeder.name && (bottomFeeder.streak % 5 == 0) && playerCount > 1){
            scores = scores.map(subArr => subArr.map((el, i) => i === 2 && subArr[0] === socket.id ? (parseInt(el) + (Math.floor(parseInt(bottomFeeder.streak)/5))) : el));
            scores = scores.map(subArr => subArr.map((el, i) => i === 7 && subArr[0] === socket.id ? el.concat([["Bottom Feeder", (Math.floor(parseInt(bottomFeeder.streak)/5))]]) : el));
        }

        // DIFFICULTY
        // TODO change this to use rank formula after testing non-int dream difficulties
        difficulty[buffer[buffer.length-1]]++;
        // make sure the dream we just changed is a valid number and between -5 and 15
        if (difficulty[buffer[buffer.length-1]] >= -5 && difficulty[buffer[buffer.length-1]] <= 15) {
            client.set(("%difficulty"),difficulty.join(","));
        } else {
            console.log("ERROR: difficulty is not between -5 and 15: " + difficulty[buffer[buffer.length-1]]);
            if (difficulty[buffer[buffer.length-1]] < -5){
                difficulty[buffer[buffer.length-1]] = -5;
            } else if (difficulty[buffer[buffer.length-1]] > 15){
                difficulty[buffer[buffer.length-1]] = 15;
            } else {
                console.log("ERROR: difficulty is not a number: " + difficulty[buffer[buffer.length-1]] + ". Setting to 5.");
                difficulty[buffer[buffer.length-1]] = 5;
            }
        }

        io.emit("update_scores", scores);
    });

    socket.on("toggle_gnome", () => {
        gnome = !gnome;
        io.emit("toggle_gnome_button_status", gnome);
        if (!gnome){
            gnomeChance=-1;
        }
    });
});


// helper funcs -----------------------------
async function fetch(key) {
    let out = client.get(key);
    await out.then(function(result) {
        redisResult = result;
      })
}
var dream = "";
var dreamer = "";
var dreamDifficulty = null;
var buffer = [];
async function updateRandomDream(type, socket){
    if (type === "new") {
        roundNumber++;
        if (dreamCount < 1) {
            await fetch("&dreamcount");
            dreamCount = parseInt(redisResult);
        }
        let count = dreamCount;
        let rng = Math.floor(Math.random() * Math.floor(count));
        let i = 0;
        // if dream is in buffer, or difficulty is too easy or hard (with progressive tolerance), reroll

        // progressive difficulty for first 70 rounds (quickplay mode)
        console.log("roundNumber: " + roundNumber);
        /*
        if (roundNumber <= 70) {
            let lowerBounds;
            let upperBounds;

            // let the first 1 be medium-hard to prevent refresh farming
            if (roundNumber === 1){
                lowerBounds = 4;
                upperBounds = 9;
            }
            // the next 3 be trivial
            else if (roundNumber < 5){
                lowerBounds = -999;
                upperBounds = -3;
            }
            // after that, we give a very hard every 10th round
            else if (roundNumber % 10 === 0){
                lowerBounds = 10;
                upperBounds = 999;
            }
            // and an easy one every 5th round
            else if (roundNumber % 5 === 0){
                lowerBounds = -999;
                upperBounds = 3;
            }
            // else, slowly increase diff
            else {
                lowerBounds = -3 + Math.floor(roundNumber/5);
                upperBounds = 6 + Math.floor(roundNumber/5);
            }

            /*
            if (roundNumber <= 10){
                lowerBounds = -999;
                upperBounds = -3;
            }
            else if (roundNumber <= 20){
                lowerBounds = -2;
                upperBounds = 0;
            }
            else if (roundNumber <= 30){
                lowerBounds = 1;
                upperBounds = 3;
            }
            else if (roundNumber <= 40){
                lowerBounds = 4;
                upperBounds = 6;
            }
            else if (roundNumber <= 50){
                lowerBounds = 7;
                upperBounds = 9;
            }
            else if (roundNumber <= 70){
                lowerBounds = 10;
                upperBounds = 999;
            }
            
            this is commented out until we have more impossible dreams
            else if (roundNumber <= 60){
                lowerBounds = 10;
                upperBounds = 12;
            }
            else if (roundNumber <= 70){
                lowerBounds = 13;
                upperBounds = 999;
            }
            
            while (buffer.includes(rng) || 
            ((difficulty[rng] < lowerBounds || difficulty[rng] > upperBounds) && i < 2000)
            ) {
                rng = Math.floor(Math.random() * Math.floor(count));
                i++;
            }
        }
        */
        // regular old gameplay (freeplay mode)
        
        // we want to favor dreams closer to the average rank of players in the game
        let averageRank = 0;
        if (scores.length > 0){
            for (let i = 0; i < stats.length; i++){
                // if the players whose rank we're looking at is in the game (in scores), count it towards the average
                if (scores.some(item => item[1] === stats[i][0])){
                    // if its a string convert to floating point number
                    let rank = stats[i][7];
                    if (typeof stats[i][7] === "string") {
                        rank = parseFloat(stats[i][7]);
                    }
                    averageRank += rank;
                }
            }
            averageRank = averageRank / scores.length;
        } else {
            console.log("ERROR: scores.length is not greater than 0: " + scores.length);
            averageRank = 5;
        }

        // if not a number or null or undefined or under -5 or over 15, set to 5
        if (isNaN(averageRank) || averageRank === null || averageRank === undefined || averageRank < -5 || averageRank > 15){
            console.log("ERROR: averageRank is: " + averageRank + " with " + scores.length + " players. Setting to 5.");
            averageRank = 5;
        }
        // slowly increase bounds until we find a dream
        while ( buffer.includes(rng) || (difficulty[rng] < (averageRank - i/10) || difficulty[rng] > (averageRank + i/10)) ) 
        {
            // special case: if dream is within the last 20 (increasing) most recently added, add it if difficulty is between 4 and 6 (implies unsorted)
            // upped this to 700 temporarily because we have a lot of unsorted dreams
            if (rng > count - (700 + i) && rng < count && difficulty[rng] > 4 && difficulty[rng] < 6){
                break;
            }

            rng = Math.floor(Math.random() * Math.floor(count));
            i++;
        }

        buffer.push(rng);
        if (buffer.length > 700) {
            buffer.shift();
        }
        client.set(("%buffer"),buffer.join(","));
        dreamDifficulty = parseInt(difficulty[rng]);
        console.log("dream #" + rng + " selected. It's difficulty is: " + difficulty[rng] + ". Found with counter: " + i + ". Average Rank: " + averageRank);
        console.log("Buffer: " + buffer);
        await fetch("&dream"+rng);
        dream = redisResult;
        await fetch("&dreamer"+rng);
        dreamer = redisResult;
        io.emit("get_random_dream_d", { dream, dreamer, gnomeChance, dreamDifficulty, roundNumber } );
    } else {
        socket.emit("get_random_dream_d", { dream, dreamer, gnomeChance, dreamDifficulty, roundNumber } );
    }
}

async function updateStats() {
    stats = [];
    for (let n of names) {
        await fetch("%" + n);
        let temp = redisResult.split(",")
        temp.unshift(n)
        stats.push(temp);
    }
    io.emit("update_stats", stats);
    loadDifficulty();
}

async function updatePFPs() {
    PFPs = []
    for (let n of names) {
        await fetch("$" + n);
        PFPs.push([n, redisResult]);
    }
    io.emit("update_PFPs", PFPs);
}

async function loadDifficulty() {
    await fetch("%difficulty");
    difficulty = redisResult.split(",");
}

async function loadBuffer() {
    await fetch("%buffer");
    buffer = redisResult.split(",");
}

// GETTERS AND SETTERS FOR scores VARIABLE

function getName(socket) {
    const name = scores.find(subarray => subarray[0] === socket.id);
    if (Array.isArray(name)) {
        return name[1];
    }
}

function getScore(socket) {
    const name = scores.find(subarray => subarray[0] === socket.id);
    if (Array.isArray(name)) {
        return name[2];
    }
}
function getReady(socket) {
    const name = scores.find(subarray => subarray[0] === socket.id);
    if (Array.isArray(name)) {
        return name[3];
    }
}

function getGuess(socket) {
    const name = scores.find(subarray => subarray[0] === socket.id);
    if (Array.isArray(name)) {
        return name[4];
    }
}

function setReady(socket, value) {
    if (socket === "all"){
        for (let i = 0; i < scores.length; i++) {
            scores[i][3] = value;
        }
    } else {
        for (let i = 0; i < scores.length; i++) {
            if (scores[i][0] === socket.id) {
                scores[i][3] = value;
            }
        }
    }
}

function setGuess(socket, value) {
    if (socket === "all"){
        for (let i = 0; i < scores.length; i++) {
            scores[i][4] = value;
        }
    } else {
        for (let i = 0; i < scores.length; i++) {
            if (scores[i][0] === socket.id) {
                scores[i][4] = value;
            }
        }
    }
}

function clearBonus() {
    for (let i = 0; i < scores.length; i++) {
        scores[i][7] = [];
    }
}

function setIndexes(name) {
    let statindex = -1;
    let scoreindex = -1;
    let dreamerindex = -1;
    for (let i = 0; i < scores.length; i++) {
        if (scores[i][1] === name) {
            scoreindex = i;
            
        }
        if (scores[i][1] === dreamer) {
            dreamerindex = i;
        }
    }
    for (let i = 0; i < stats.length; i++) {
        if (stats[i][0] === name) {
            statindex = i;
            break;
        }
    }
    return [statindex, scoreindex, dreamerindex];
}

/* notes
alright so
any time you want to ping redis for fucking anything
you need to use async and await
so
have your socket.on call some random async function
(IT CAN'T DO ANYTHING ELSE)
and then have that random async function do your dirty work
and use await for every fetch
then get the return of fetch from redisResult variable

naming conventions:
fetch = get from redis
write = set to redis
get = get variable in server
set = set variable in server
update = server to client
send = client to server
request = client to sever expecting a return update
*/