const dotenv = require("dotenv");
const path = require("path");
const envFile = process.env.REDIS_ENV_FILE
    ? path.resolve(process.env.REDIS_ENV_FILE)
    : path.join(__dirname, ".env");
dotenv.config({ path: envFile });
const Redis = require("ioredis");
const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
    throw new Error(`REDIS_URL is not configured in ${envFile}`);
}
const client = new Redis(redisUrl, redisUrl.startsWith("rediss://") ? {
    tls: {
        rejectUnauthorized: false
    }
} : {});
const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
app.use(cors());
const server = http.createServer(app);
server.on("error", (error) => {
    console.error(`HTTP server error: ${error.message}`);
    process.exitCode = 1;
    process.exit(1);
});
app.use(express.static(path.join(__dirname, '../build')));
app.get('/', (req, res, next) => res.sendFile(__dirname + './index.html'));

const io = new Server(server, {
    cors: {
      origin: ["http://localhost:3000", "https://dreamgame.herokuapp.com/", "http://www.ethananderson.ca/", "https://dreamgame.ethananderson.ca/"], // FOR PROD
      methods: ["GET", "POST"],
    },
});

// dreamgame variables
let names = ["Ethan", "Cole", "Nathan", "Oobie", "Devon", "Mitch", "Max", "Adam", "Eric", "Dylan", "Jack", "Devo", "Zach", "Ailís", "Guest"]
let playerCount = 0;
let guessCount = 0;
let scores = []; // [ 0 id,  1 name, 2 score, 3 is ready, 4 guess, 5 skill rating, 6 previous score, 7 bonus Array ]
let stats = [];  // [ 0 name , 1 correct answers, 2 incorrect answers, 3 longest correct answer streak, 
                 // 4 gnome count, 5 memory correct answers, 6 memory incorrect answers, 7 rank ]
                 // (Memory correct/incorrect is the number of times a player has guessed their own dream correctly/incorrectly)
                 // rank is an elo style rating that is updated after each round based on the difficulty of the dream and the player's current rank
                 // the difficulty of the dream is a number between -5 and 15, with -5 being the easiest and 15 being the hardest
let difficulty = [];
let status = "before";
let bottomFeeder = {
    name: "",
    streak: 0
  };
let earlyBird = "";
let PFPs = [];
const DEFAULT_PROFILE_PICTURE = "/player.png";
let gnome = false;
var gnomeChance = -1;
let roundNumber = 0;
let dreamCount = 0;
let startingRound = false;
let roundTimer = null;
let processedAnswers = new Set();
let shuttingDownForRedis = false;

client.on("error", (error) => {
    console.error(`Redis connection error: ${error.message}`);
    shutdownForRedis();
});

client.on("end", () => {
    shutdownForRedis();
});

// receiving socket stuff goes in this func
io.on("connection", (socket) => {

    socket.emit("update_stats", stats);
    socket.emit("update_PFPs", PFPs);
    socket.emit("update_scores", scores);

    socket.on("disconnect", () => {
        const name = scores.find(subarray => subarray[0] === socket.id);
        if (Array.isArray(name)) {console.log(`User Disconnected: ${socket.id} ${name[1]}`);}
        // only decrease playercount if the user had selected a name
        if (scores.some(item => item[0] === socket.id)){
            playerCount--;

            if (getReady(socket) === "Ready") {
                guessCount--;
            }

        }        
        if (playerCount <= 0){
            playerCount = 0;
            gnome = false;
            gnomeChance = -1;
            status = "before";
            clearTimeout(roundTimer);
            roundTimer = null;
        }
        if (playerCount <= 0 || guessCount <= 0){
            guessCount = 0;
        }
        scores = scores.filter(subArr => !subArr.includes(socket.id));
        if (status === "during" && playerCount > 0 &&
            scores.every((entry) => entry[3] === "Ready")) {
            finishRound();
        }
        io.emit("update_scores", scores);
        console.log("Player Count: " + playerCount + " --- Guess Count: " + guessCount);
      });
  
    // After new player selects their name
    socket.on("player_join", safeAsyncHandler("player_join", async (name) => {
        if (typeof name !== "string" || !names.includes(name)) {
            console.error(`Rejected invalid player name: ${name}`);
            return;
        }
        console.log(`User Connected: ${socket.id} ${name}`);
        //socket.broadcast.emit("update_players", name);
        if (!scores.some(item => item[1] === name)){
            // if no players connected when a player joins, reset round number
            if (playerCount === 0) {
                roundNumber = 0;
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
        io.emit("update_PFPs", PFPs);
    }));

    // After new player selects their name
    socket.on("get_random_dream_u", safeAsyncHandler("get_random_dream_u", async () => {
        if (!scores.some((entry) => entry[0] === socket.id)) {
            console.error(`Rejected round request from unregistered socket ${socket.id}`);
            return;
        }
        if (startingRound) {
            return;
        }
        // this if statement with new/refresh stops mid-round joiners from triggering new dream
        if (!(status === "during")){
            startingRound = true;
            try {
                const started = await updateRandomDream("new", socket);
                if (!started) {
                    return;
                }
                status = "during";
                processedAnswers = new Set();
                setReady("all", "Waiting...");
                clearBonus();
                io.emit("update_scores", scores);
                scheduleRoundTimeout();
                // only a 20% chance of gnome appearing if gnome is enabled
                if (gnome) {
                    gnomeChance = Math.floor(Math.random() * 5);
                }
            } finally {
                startingRound = false;
            }
        } else {
            await updateRandomDream("refresh", socket);
        }
    }));

    socket.on("guess", (guess) => {
        const player = scores.find((entry) => entry[0] === socket.id);
        if (!player || status !== "during" || player[3] === "Ready") {
            return;
        }
        if (typeof guess !== "string" || guess.length > 200) {
            console.error(`Rejected invalid guess from ${player[1]}`);
            return;
        }
        console.log("Guess #" + guessCount + "   Of:" + guess + "   From guesser: " + player[1]);
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
            finishRound();
        }
    });

    socket.on("send_message", (data) => {
        const player = scores.find((entry) => entry[0] === socket.id);
        if (!player || !data || typeof data.message !== "string" ||
            data.message.length === 0 || data.message.length > 500) {
            return;
        }
        let message = data.message;
        let name = player[1];
        io.emit('receive_message', { message, name });
    });

    socket.on("correct", safeAsyncHandler("correct", async (name) => {
        
        let statindex = -1;
        let scoreindex = -1;
        let dreamerindex = -1;
        [statindex, scoreindex, dreamerindex] = setIndexes(name);
        if (!isValidPlayerIndexes(statindex, scoreindex)) {
            console.error(`Cannot process correct answer for unknown player: ${name}`);
            return;
        }
        if (!isValidAnswerSubmission(socket, name, true)) {
            return;
        }
        if (!isValidRoundState()) {
            return;
        }

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
        // update the player's rank based on the difficulty of the dream and their current rank
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
            await write("%" + name, temp.join(","));
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
            await write("%difficulty", difficulty.join(","));
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
            await write("%difficulty", difficulty.join(","));
        }
        io.emit("update_scores", scores);
    }));

    socket.on("incorrect", safeAsyncHandler("incorrect", async (name) => {
        let statindex = -1;
        let scoreindex = -1;
        let dreamerindex = -1;
        [statindex, scoreindex, dreamerindex] = setIndexes(name);
        if (!isValidPlayerIndexes(statindex, scoreindex)) {
            console.error(`Cannot process incorrect answer for unknown player: ${name}`);
            return;
        }
        if (!isValidAnswerSubmission(socket, name, false)) {
            return;
        }
        if (!isValidRoundState()) {
            return;
        }
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
            await write("%difficulty", difficulty.join(","));
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
            await write("%difficulty", difficulty.join(","));
        }

        io.emit("update_scores", scores);
    }));

    socket.on("toggle_gnome", () => {
        gnome = !gnome;
        io.emit("toggle_gnome_button_status", gnome);
        if (!gnome){
            gnomeChance=-1;
        }
    });
});

function safeAsyncHandler(label, handler) {
    return async (...args) => {
        try {
            await handler(...args);
        } catch (error) {
            console.error(`${label} failed: ${error.message}`);
        }
    };
}

function finishRound() {
    if (status !== "during") {
        return;
    }

    clearTimeout(roundTimer);
    roundTimer = null;
    console.log("Server side all guessed. Dreamer: " + dreamer);
    io.emit("all_guessed", dreamer);
    guessCount = 0;
    status = "after";

    if (playerCount > 1 && scores.length > 0) {
        const orderedScores = [...scores].sort((a, b) => a[2] - b[2]);
        const minSubarray = orderedScores[0];
        const nextMinSubarray = orderedScores.find((entry) => entry[2] > minSubarray[2]);
        if (nextMinSubarray &&
            bottomFeeder.name === minSubarray[1] &&
            minSubarray[2] < (nextMinSubarray[2] / 2)) {
            bottomFeeder.streak++;
        } else {
            bottomFeeder.name = minSubarray[1];
            bottomFeeder.streak = 1;
        }
    }
}

function scheduleRoundTimeout() {
    clearTimeout(roundTimer);
    const roundSeconds = 10 + Math.floor((typeof dream === "string" ? dream.length : 0) / 15) + 5;
    roundTimer = setTimeout(() => {
        if (status !== "during") {
            return;
        }
        console.warn(`Round ${roundNumber} timed out. Marking unanswered players as timed out.`);
        for (const player of scores) {
            if (player[3] !== "Ready") {
                player[3] = "Ready";
                player[4] = "-----";
                guessCount++;
            }
        }
        finishRound();
    }, roundSeconds * 1000);
}

function isValidAnswerSubmission(socket, name, expectedCorrect) {
    if (status !== "after") {
        console.error(`Rejected answer for ${name}: round is not waiting for answers.`);
        return false;
    }

    const player = scores.find((entry) => entry[0] === socket.id);
    const answerKey = `${socket.id}:${roundNumber}`;
    if (!player || player[1] !== name || player[3] !== "Ready" ||
        processedAnswers.has(answerKey)) {
        console.error(`Rejected duplicate or unauthorized answer for ${name}.`);
        return false;
    }

    const isCorrect = player[4] === dreamer;
    if (isCorrect !== expectedCorrect) {
        console.error(`Rejected inconsistent answer result for ${name}.`);
        return false;
    }

    processedAnswers.add(answerKey);
    return true;
}

function shutdownForRedis() {
    if (shuttingDownForRedis) {
        return;
    }
    shuttingDownForRedis = true;
    console.error("Redis is unavailable. Shutting down the game server.");
    clearTimeout(roundTimer);
    io.close();
    server.close(() => process.exit(1));
    setTimeout(() => process.exit(1), 5000).unref();
}


// helper funcs -----------------------------
async function fetch(key) {
    try {
        return await client.get(key);
    } catch (error) {
        console.error(`Redis read failed for ${key}: ${error.message}`);
        throw error;
    }
}

async function write(key, value) {
    try {
        await client.set(key, value);
    } catch (error) {
        console.error(`Redis write failed for ${key}: ${error.message}`);
        throw error;
    }
}

function parseInteger(value, minimum = 0) {
    if (typeof value !== "string" && typeof value !== "number") {
        return null;
    }
    const text = String(value).trim();
    if (!/^-?\d+$/.test(text)) {
        return null;
    }
    const parsed = Number.parseInt(text, 10);
    return Number.isSafeInteger(parsed) && parsed >= minimum ? parsed : null;
}

function parseDifficulty(value) {
    if (typeof value !== "string" && typeof value !== "number") {
        return null;
    }
    const text = String(value).trim();
    if (text === "" || !/^-?(?:\d+|\d*\.\d+)$/.test(text)) {
        return null;
    }
    const parsed = Number.parseFloat(text);
    return Number.isFinite(parsed) && parsed >= -5 && parsed <= 15 ? parsed : null;
}

function isValidPlayerIndexes(statindex, scoreindex) {
    return statindex >= 0 && statindex < stats.length &&
        scoreindex >= 0 && scoreindex < scores.length;
}

function isValidRoundState() {
    const bufferIndex = buffer[buffer.length - 1];
    if (buffer.length === 0 || parseInteger(String(bufferIndex)) === null ||
        bufferIndex >= dreamCount) {
        console.error("Cannot process answer: current round has invalid buffer data.");
        return false;
    }

    if (parseDifficulty(difficulty[bufferIndex]) === null) {
        console.error(`Invalid difficulty for current dream ${bufferIndex}. Setting it to 5.`);
        difficulty[bufferIndex] = 5;
        write("%difficulty", difficulty.join(",")).catch((error) => {
            console.error(`Failed to persist default difficulty for dream ${bufferIndex}: ${error.message}`);
        });
    }

    return true;
}
var dream = "";
var dreamer = "";
var dreamDifficulty = null;
var buffer = [];
async function updateRandomDream(type, socket){
    if (type === "new") {
        roundNumber++;
        if (dreamCount < 1) {
            const dreamCountValue = await fetch("&dreamcount");
            const parsedDreamCount = parseInteger(dreamCountValue, 1);
            if (parsedDreamCount === null) {
                console.error(`Invalid &dreamcount value: ${dreamCountValue}. Cannot start a round.`);
                return false;
            }
            dreamCount = parsedDreamCount;
        }
        let count = dreamCount;
        if (count > difficulty.length) {
            console.error(`&dreamcount is ${count}, but only ${difficulty.length} difficulty values are available. Filling missing values with 5.`);
            difficulty = difficulty.concat(Array(count - difficulty.length).fill(5));
            await write("%difficulty", difficulty.join(","));
        }
        let rng = Math.floor(Math.random() * Math.floor(count));
        let i = 0;

        console.log("roundNumber: " + roundNumber);
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
        const maxAttempts = Math.max(100000, count * 20);
        while (i < maxAttempts && (buffer.includes(rng) || (difficulty[rng] < (averageRank - i/10) || difficulty[rng] > (averageRank + i/10)))) 
        {
            // special case: if dream is within the last 20 (increasing) most recently added, add it if difficulty is between 4 and 6 (implies unsorted)
            // upped this to 700 temporarily because we have a lot of unsorted dreams
            if (rng > count - (700 + i) && rng < count && difficulty[rng] > 4 && difficulty[rng] < 6){
                break;
            }

            rng = Math.floor(Math.random() * Math.floor(count));
            i++;
        }

        if (i >= maxAttempts || buffer.includes(rng) ||
            difficulty[rng] < (averageRank - i / 10) ||
            difficulty[rng] > (averageRank + i / 10)) {
            console.warn(`Unable to select a preferred dream after ${maxAttempts} attempts. Selecting randomly.`);
            rng = Math.floor(Math.random() * Math.floor(count));
        }

        const candidateIndexes = [rng];
        for (let offset = 1; offset < count; offset++) {
            candidateIndexes.push((rng + offset) % count);
        }

        let selected = false;
        for (const candidate of candidateIndexes) {
            const candidateDream = await fetch("&dream" + candidate);
            const candidateDreamer = await fetch("&dreamer" + candidate);
            if (typeof candidateDream !== "string" || candidateDream.trim() === "" ||
                typeof candidateDreamer !== "string" || candidateDreamer.trim() === "") {
                console.error(`Missing dream data for index ${candidate}. Trying another dream.`);
                continue;
            }

            rng = candidate;
            dream = candidateDream;
            dreamer = candidateDreamer;
            selected = true;
            break;
        }

        if (!selected) {
            console.error("No dream records contain both dream text and a dreamer.");
            return false;
        }

        const normalizedDifficulty = parseDifficulty(String(difficulty[rng]));
        if (normalizedDifficulty === null) {
            difficulty[rng] = 5;
            await write("%difficulty", difficulty.join(","));
            dreamDifficulty = 5;
        } else {
            dreamDifficulty = normalizedDifficulty;
        }

        buffer.push(rng);
        if (buffer.length > 700) {
            buffer.shift();
        }
        await write("%buffer",buffer.join(","));
        console.log("dream #" + rng + " selected. It's difficulty is: " + dreamDifficulty + ". Found with counter: " + i + ". Average Rank: " + averageRank);
        console.log("Buffer: " + buffer);
        io.emit("get_random_dream_d", { dream, dreamer, gnomeChance, dreamDifficulty, roundNumber } );
        return true;
    } else {
        socket.emit("get_random_dream_d", { dream, dreamer, gnomeChance, dreamDifficulty, roundNumber } );
        return true;
    }
}

async function updateStats() {
    stats = [];
    for (let n of names) {
        const value = await fetch("%" + n);
        const temp = await normalizePlayerStats(n, value);
        temp.unshift(n)
        stats.push(temp);
    }
    io.emit("update_stats", stats);
    await loadDifficulty();
}

async function normalizePlayerStats(name, value) {
    const rawStats = typeof value === "string" ? value.split(",") : [];
    const normalizedStats = [];

    for (let i = 0; i < 6; i++) {
        const stat = rawStats[i];
        normalizedStats.push(typeof stat === "string" && /^\d+$/.test(stat.trim())
            ? String(parseInt(stat.trim(), 10))
            : "0");
    }

    const rank = rawStats[6];
    normalizedStats.push(typeof rank === "string" && /^-?\d+(?:\.\d{1,2})?$/.test(rank.trim())
        ? Number.parseFloat(rank.trim()).toFixed(2)
        : "0.00");

    const normalizedValue = normalizedStats.join(",");
    if (value !== normalizedValue) {
        console.log(`Repairing Redis stats for ${name}: ${value === null ? "missing value" : value} -> ${normalizedValue}`);
        await write("%" + name, normalizedValue);
    }

    return normalizedStats;
}

async function updatePFPs() {
    PFPs = await Promise.all(names.map(async (name) => {
        const value = await fetch("$" + name);
        const profilePicture = await getValidProfilePicture(value, name);
        return [name, profilePicture];
    }));
    io.emit("update_PFPs", PFPs);
}

async function getValidProfilePicture(value, name) {
    if (typeof value !== "string" || value.trim() === "") {
        return DEFAULT_PROFILE_PICTURE;
    }

    let url;
    try {
        url = new URL(value);
    } catch (error) {
        console.error(`Invalid profile picture URL for ${name}: ${value}`);
        return DEFAULT_PROFILE_PICTURE;
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") {
        console.error(`Unsupported profile picture URL for ${name}: ${value}`);
        return DEFAULT_PROFILE_PICTURE;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
        let response = await globalThis.fetch(url, {
            method: "HEAD",
            redirect: "follow",
            signal: controller.signal
        });

        // Some image hosts do not implement HEAD, so request only one byte.
        if (response.status === 405) {
            response = await globalThis.fetch(url, {
                headers: { Range: "bytes=0-0" },
                redirect: "follow",
                signal: controller.signal
            });
        }

        const contentType = response.headers.get("content-type") || "";
        if (!response.ok || !contentType.toLowerCase().startsWith("image/")) {
            console.error(`Profile picture unavailable for ${name}: ${value} (${response.status}, ${contentType || "unknown content type"})`);
            return DEFAULT_PROFILE_PICTURE;
        }

        return value;
    } catch (error) {
        console.error(`Profile picture check failed for ${name}: ${value} (${error.message})`);
        return DEFAULT_PROFILE_PICTURE;
    } finally {
        clearTimeout(timeout);
    }
}

async function loadDifficulty() {
    const value = await fetch("%difficulty");
    if (value === null || value === undefined || value === "") {
        difficulty = [];
    } else {
        const rawDifficulty = value.split(",");
        difficulty = rawDifficulty.map((entry, index) => {
            const parsed = parseDifficulty(entry);
            if (parsed === null) {
                console.error(`Invalid difficulty at index ${index}: ${entry}. Setting it to 5.`);
                return 5;
            }
            return parsed;
        });
        const normalizedValue = difficulty.join(",");
        if (normalizedValue !== value) {
            await write("%difficulty", normalizedValue);
        }
    }
}

async function loadBuffer() {
    const value = await fetch("%buffer");
    if (value === null || value === undefined || value === "") {
        buffer = [];
    } else {
        const rawBuffer = value.split(",");
        buffer = rawBuffer.reduce((validEntries, entry, index) => {
            const parsed = parseInteger(entry);
            if (parsed === null) {
                console.error(`Invalid dream buffer entry at index ${index}: ${entry}. Removing it.`);
                return validEntries;
            }
            validEntries.push(parsed);
            return validEntries;
        }, []);
        const normalizedValue = buffer.join(",");
        if (normalizedValue !== value) {
            await write("%buffer", normalizedValue);
        }
    }
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
naming conventions:
fetch = get from redis
write = set to redis
get = get variable in server
set = set variable in server
update = server to client
send = client to server
request = client to sever expecting a return update
*/

async function initialize() {
    await client.ping();
    await updateStats();
    await loadBuffer();
    await updatePFPs();

    server.listen(process.env.PORT || 3001, () => {
        console.log("SERVER IS RUNNING");
    });
}

initialize().catch((error) => {
    console.error(`Server initialization failed: ${error.message}`);
    shutdownForRedis();
});