// ---------- Don't touch this section ----------
const redis = require("ioredis");
const client = redis.createClient(process.env.REDIS_URL);
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
var names = ["Ethan", "Nathan", "Cole", "Max", "Devon", "Oobie", "Eric", "Dylan", "Adam", "Mitch", "Jack", "Zach", "Devo"]
let redisResult = "default_redisResult_value";
let playerCount = 0;
let guessCount = 0;
let scores = [];
let stats = []; // [ 0name , 1corr, 2incorr, 3longeststreak, 4gnomecount, 5memcorr, 6memincorr ]
let status = "before";
let bottomFeeder = {
    name: "",
    streak: 0
  };
let earlyBird = "";
let PFPs = [];

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
            if (guessCount === playerCount){
                console.log("server side all guessed: "+ redisResult);
                io.emit("all_guessed", redisResult);
                guessCount = 0;
                status = "after";
            }
        }        
        if (playerCount <= 0){
            playerCount = 0;
        }
        if (playerCount <= 0 || guessCount <= 0){
            guessCount = 0;
        }
        scores = scores.filter(subArr => !subArr.includes(socket.id));
        io.emit("update_scores", scores);
        console.log("Player Count: " + playerCount)
        console.log("Guess Count: " + guessCount);;
      });
  
    // After new player selects their name
    socket.on("player_join", (name) => {
        console.log(`User Connected: ${socket.id} ${name}`);
        socket.broadcast.emit("update_players", name);
        if (!scores.some(item => item[1] === name)){
            playerCount++;
            // scores variable items: id, name, score, ready, guess, streak, scorePrev, bonus Array
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
        } else {
            updateRandomDream("refresh", socket);
        }
    });

    socket.on("guess", (guess) => { 
        console.log("server side recieved guess of:" + guess + "  From guesser: " + getName(socket));
        guessCount++;
        console.log("Guess Count: " + guessCount); 
        setReady(socket, "Ready");
        setGuess(socket, guess);
        scores = scores.map(subArr => subArr.map((el, i) => i === 6 && subArr[0] === socket.id ? subArr[2] : el)); // scorePrev
        io.emit("update_scores", scores);
        if (guessCount <= 1){
            earlyBird = getName(socket);
        }
        if (guessCount === playerCount){
            console.log("Server side all guessed. Dreamer: "+ dreamer);
            io.emit("all_guessed", dreamer);
            guessCount = 0;
            status = "after";

            // bottom feeder
            let minSubarray = scores[0];
            for (let i = 1; i < scores.length; i++) {
                if (scores[i][2] < minSubarray[2]) {
                  minSubarray = scores[i];
                }
            }
            if (bottomFeeder.name === minSubarray[1]) {
                bottomFeeder.streak++;
            } else {
                bottomFeeder.name = minSubarray[1];
                bottomFeeder.streak = 1;
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

        if (scores[scoreindex][5] <= 0) {
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
        io.emit("update_stats", stats);
        let temp = stats[statindex].slice(0, -1);
        if (temp[0] === name) {
            temp.shift();
        }
        client.set(("%"+name),temp.join(","));

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
        if (scores[scoreindex][5] >= 5) {
            scores = scores.map(subArr => subArr.map((el, i) => i === 2 && subArr[0] === socket.id ? (parseInt(el) + (Math.floor(parseInt(scores[scoreindex][5])/5))) : el));
            scores = scores.map(subArr => subArr.map((el, i) => i === 7 && subArr[0] === socket.id ? el.concat([["Streak x"+scores[scoreindex][5], (Math.floor(parseInt(scores[scoreindex][5])/5))]]) : el));
        }
        // bottom feeder bonus
        if (name === bottomFeeder.name && (bottomFeeder.streak % 5 == 0)){
            scores = scores.map(subArr => subArr.map((el, i) => i === 2 && subArr[0] === socket.id ? (parseInt(el) + (Math.floor(parseInt(bottomFeeder.streak)/5))) : el));
            scores = scores.map(subArr => subArr.map((el, i) => i === 7 && subArr[0] === socket.id ? el.concat([["Bottom Feeder", (Math.floor(parseInt(bottomFeeder.streak)/5))]]) : el));
        }
        // early bird bonus
        if (name === earlyBird && playerCount > 2) {
            scores = scores.map(subArr => subArr.map((el, i) => i === 2 && subArr[0] === socket.id ? (parseInt(el) + 1) : el));
            scores = scores.map(subArr => subArr.map((el, i) => i === 7 && subArr[0] === socket.id ? el.concat([["Early Bird", 1]]) : el));
        }
        // irony bonus 
        if (scores[scoreindex][5] >= 1 && dreamerindex != -1 && scores[dreamerindex][4] !== dreamer) {
            scores = scores.map(subArr => subArr.map((el, i) => i === 2 && subArr[0] === socket.id ? (parseInt(el) + 1) : el));
            scores = scores.map(subArr => subArr.map((el, i) => i === 7 && subArr[0] === socket.id ? el.concat([["Irony", 1]]) : el));
        }
        // lone wolf bonus
        if (scores.every(subArr => subArr[4] !== dreamer || subArr[0] === socket.id) && playerCount > 2) {
            scores = scores.map(subArr => subArr.map((el, i) => i === 2 && subArr[0] === socket.id ? (parseInt(el) + 1) : el));
            scores = scores.map(subArr => subArr.map((el, i) => i === 7 && subArr[0] === socket.id ? el.concat([["Lone Wolf", 1]]) : el));
        }
        io.emit("update_scores", scores);
    });

    socket.on("incorrect", (name) => {
        let statindex = -1;
        let scoreindex = -1;
        for (let i = 0; i < scores.length; i++) {
            if (scores[i][1] === name) {
                scoreindex = i;
                break;
            }
        }
        for (let i = 0; i < stats.length; i++) {
            if (stats[i][0] === name) {
                statindex = i;
                break;
            }
        }
        // STATS
        // incorrect guesses stat
        stats = stats.map(subArr => subArr.map((el, i) => i === 2 && subArr[0] === name ? parseInt(el) + 1 : el));
        io.emit("update_stats", stats);

        // BONUSES
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
            if (scores[scoreindex][5] <= -5) {
        // biggest loser bonus
                scores = scores.map(subArr => subArr.map((el, i) => i === 2 && subArr[0] === socket.id ? (parseInt(el) + 1) : el));
                scores = scores.map(subArr => subArr.map((el, i) => i === 5 && subArr[0] === socket.id ? 0 : el)); // reset streak to 0
                scores = scores.map(subArr => subArr.map((el, i) => i === 7 && subArr[0] === socket.id ? el.concat([["Biggest Loser", 1]]) : el));
            }
        }
        // bottom feeder bonus
        if (name === bottomFeeder.name && (bottomFeeder.streak % 5 == 0)){
            scores = scores.map(subArr => subArr.map((el, i) => i === 2 && subArr[0] === socket.id ? (parseInt(el) + (Math.floor(parseInt(bottomFeeder.streak)/5))) : el));
            scores = scores.map(subArr => subArr.map((el, i) => i === 7 && subArr[0] === socket.id ? el.concat([["Bottom Feeder", (Math.floor(parseInt(bottomFeeder.streak)/5))]]) : el));
        }
        io.emit("update_scores", scores);
        
    });

    socket.on("increment_score", (name) => {
        scores = scores.map(subArr => subArr.map((el, i) => i === 2 && subArr[0] === socket.id ? el + 1 : el));
        io.emit("update_scores", scores);
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
var buffer = [];
async function updateRandomDream(type, socket){
    if (type === "new") {
        await fetch("&dreamcount");
        let count = parseInt(redisResult);
        // generate random dream unseen for 100 length buffer
        let rng = Math.floor(Math.random() * Math.floor(count));
        while (buffer.includes(rng)) {
            rng = Math.floor(Math.random() * Math.floor(count));
        }
        buffer.push(rng);
        if (buffer.length > 100) {
            buffer.shift();
        }
        console.log("Buffer: " + buffer);
        await fetch("&dream"+rng);
        dream = redisResult;
        await fetch("&dreamer"+rng);
        dreamer = redisResult;
        io.emit("get_random_dream_d", { dream, dreamer} );
    } else {
        socket.emit("get_random_dream_d", { dream, dreamer} );
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
}

async function updatePFPs() {
    PFPs = []
    for (let n of names) {
        await fetch("$" + n);
        PFPs.push([n, redisResult]);
    }
    io.emit("update_PFPs", PFPs);
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