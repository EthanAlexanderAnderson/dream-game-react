// ---------- Don't touch this section ----------
const redis = require("ioredis");
const client = redis.createClient("redis://:pd461d2ca0afbb0e93ddfcda006691526b53a83f255f1420c145b5a39eec47ba9@ec2-52-45-198-235.compute-1.amazonaws.com:9719");
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
var names = ["Ethan", "Nathan", "Cole", "Max", "Devon", "Oobie", "Eric", "Dylan", "Adam", "Mitch", "Jack", "Zach", "Devo", "Eddie"]
let redisResult = "default_redisResult_value";
let playerCount = 0;
let guessCount = 0;
let scores = [];
let stats = []; // [ 0name , 1corr, 2incorr, 3longeststreak, 4gnomecount, 5memcorr, 6memincorr ]
let status = "before";

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
            // scores variable items: id, name, score, ready, guess, streak, scorePrev
            scores.push([socket.id, name, 0, "Waiting...", "null", 0, 0]);
            for (let s of stats) {
                if (s[0] === name) {
                    s.push(socket.id);
                    
                  break;
                }
              }
        }
        console.log("Player Count: " + playerCount);
        io.emit("update_scores", scores);
    });

    // After new player selects their name
    socket.on("get_random_dream_u", (data) => {
        // this if statement with new/refresh stops mid-round joiners from triggering new dream
        if (!(status === "during")){
            updateRandomDream("new", socket);
            status = "during";
            setReady("all", "Waiting...");
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
        if (guessCount === playerCount){
            console.log("Server side all guessed. Dreamer: "+ dreamer);
            io.emit("all_guessed", dreamer);
            guessCount = 0;
            status = "after";
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

        scores = scores.map(subArr => subArr.map((el, i) => i === 2 && subArr[0] === socket.id ? parseInt(el) + 1 : el)); // score
        stats = stats.map(subArr => subArr.map((el, i) => i === 1 && subArr[0] === name ? parseInt(el) + 1 : el)); // corr
        scores = scores.map(subArr => subArr.map((el, i) => i === 5 && subArr[0] === socket.id ? parseInt(el) + 1 : el)); // streak
        console.log("if "+parseInt(scores[scoreindex][5])+" > "+parseInt(stats[statindex][3]));
        if (parseInt(scores[scoreindex][5]) > parseInt(stats[statindex][3])) {
            stats = stats.map(subArr => subArr.map((el, i) => i === 3 && subArr[0] === name ? parseInt(stats[statindex][3]) + 1 : el)); // longest
        }
        io.emit("update_scores", scores);
        io.emit("update_stats", stats);
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
        stats = stats.map(subArr => subArr.map((el, i) => i === 2 && subArr[0] === name ? parseInt(el) + 1 : el)); // incor
        scores = scores.map(subArr => subArr.map((el, i) => i === 5 && subArr[0] === socket.id ? 0 : el)); // streak
        io.emit("update_scores", scores);
        io.emit("update_stats", stats);
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