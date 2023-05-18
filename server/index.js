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
const names = ["Ethan", "Cole", "Nathan", "Oobie", "Devon", "Max", "Mitch", "Adam", "Eric", "Dylan", "Devo", "Jack", "Zach"]
const recordIndex = new Map();
let redisResult = "default_redisResult_value";
let playerCount = 0;
let guessCount = 0;
let records = [];
let corrects = [];

let status = "before";


initializeRecords();


// receiving socket stuff goes in this func
io.on("connection", (socket) => {


    socket.on("disconnect", () => {
        // only decrease playercount if the user had selected a name
        if (recordIndex.has(socket.id)){
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

            records[recordIndex.get(socket.id)][3] = 'null';
        }        
        if (playerCount <= 0){
            playerCount = 0;
        }
        if (playerCount <= 0 || guessCount <= 0){
            guessCount = 0;
        }
        io.emit("update_records", records);
        console.log("Player Count: " + playerCount + " Guess Count: " + guessCount)
      });
  
    // After new player selects their name
    socket.on("player_join", (name) => {
        console.log(`User Connected: ${socket.id} ${name}`);
        for (let i = 0; i < records.length; i++) {
            if (name === records[i][0]) {
                recordIndex.set(socket.id, i);
                setReady(socket, "Waiting...");
                playerCount++;
                break;
            }
        }
        console.log("Player Count: " + playerCount + " Guess Count: " + guessCount)
        io.emit("update_records", records);
    });

    // After new player selects their name
    socket.on("get_random_dream_u", (data) => {
        // this if statement with new/refresh stops mid-round joiners from triggering new dream
        if (!(status === "during")){
            updateRandomDream("new", socket);
            status = "during";
            setReady("all", "Waiting...");
            //io.emit("update_records", records);
        } else {
            updateRandomDream("refresh", socket);
        }
    });

    socket.on("guess", (guess) => {
        guessCount++;
        let index = recordIndex.get(socket.id);
        let name = getName(socket);
         
        console.log("server side recieved guess of:" + guess + "  From guesser: " + name);
        console.log("Player Count: " + playerCount + " Guess Count: " + guessCount) 
        setReady(socket, "Ready");
        setGuess(socket, guess);
        // TODO stop this from showing score / stats before round over
        //socket.emit("update_records", records);
        //io.emit("update_records", records);

        // curr streak
        if (guess === dreamer){ 
            records[index][2]++;
        } else {
            records[index][2] = 0;
        }
        //io.emit("ready_up", index);
        
        if (guessCount === playerCount){
            // we use curr streak to set scores since it's not visible during round
            // TODO this works buuuut lags by one update
            for (let record in records) {
                if (record[3] != 'null'){
                    if (record[2] > 0){
                        record[1]++;
                        record[5]++;
                    } else {
                        record[6]++;
                    }
                }
            }
            console.log("Server side all guessed. Dreamer: "+ dreamer);
            //io.emit("update_records", records);
            io.emit("all_guessed", dreamer);
            guessCount = 0;
            status = "after";
        }
        io.emit("update_records", records);
    });

    socket.on("send_message", (data) => {
        let message = data.message;
        let name = data.name;
        io.emit('receive_message', { message, name });
    });

    socket.on("increment_score", () => {
        incrementScore(socket);
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

async function initializeRecords() {
    for (let n of names) {
        let temp = [n, 0, 0, "null", "null"]
        await fetch("%" + n);
        records.push([...temp, ...redisResult.split(",").map(Number), 0, 0, 0]);
        calcStats(names.indexOf(n));
    }
    io.emit("update_records", records);
    //console.log(records);
}

function calcStats(i) {
    let correct  = parseInt(records[i][5]);
    let incorrect = parseInt(records[i][6]);
    let ratio = ((correct/(incorrect+correct+0.001))*100).toFixed(2);
    let longestStreak = parseInt(records[i][7]);
    let skillRating = (ratio * ((correct/10) + longestStreak)).toFixed(0);
    let correctMemory  = parseInt(records[i][9]);
    let incorrectMemory = parseInt(records[i][10]);
    let memory = ((correctMemory/(correctMemory+incorrectMemory+0.001))*100).toFixed(2);

    records[i][11] = parseInt(skillRating);
    records[i][12] = parseInt(ratio);
    records[i][13] = parseInt(memory);
}

// GETTERS AND SETTERS FOR records VARIABLE

function getName(socket) {
    return records[recordIndex.get(socket.id)][0];
}

function getScore(socket) {
    return records[recordIndex.get(socket.id)][1];
}

function getStreak(socket) {
    return records[recordIndex.get(socket.id)][2];
}

function getReady(socket) {
    return records[recordIndex.get(socket.id)][3];
}

function getGuess(socket) {
    return records[recordIndex.get(socket.id)][4];
}

function setReady(socket, value) {
    if (socket === "all"){
        for (let i = 0; i < records.length; i++) {
            if (records[i][3] != 'null') {
                records[i][3] = value;
            }
        }
    } else {
        records[recordIndex.get(socket.id)][3] = value;
    }
}

function setGuess(socket, value) {
    if (socket === "all"){
        for (let i = 0; i < records.length; i++) {
            records[i][4] = value;
        }
    } else {
        records[recordIndex.get(socket.id)][4] = value;
    }
}

// different from correct for bonus point purpose
function incrementScore(socket) {
    return records[recordIndex.get(socket.id)][1]++;
}

function correct(socket) {
    let i = recordIndex.get(socket.id);
    // increment streak and set longest streak
    records[i][2]++;
    if (records[i][7] < records[i][2]) {
        records[i][7] = records[i][2];
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

varaibles old
scores : id, name, score, ready, guess, streak
stats : name, corr, incorr, longeststreak, gnomecount, memory corr, memory incorr

restruct
big record 2d array:
[ [name, score, curr streak, ready, guess, corr, incorr, longeststreak, gnomecount, memory corr, memory incorr, ratio, skill rating, memory ratio] ]
[ [ 0  ,   1  ,      2     ,   3  ,   4  ,   5 ,    6  ,       7      ,      8    ,      9     ,       10     ,   11 ,       12            13    ] ]
record index map
{ socket.id : record index }
use dictionary to get index
then use getRecord to get the record with index 0 being name



    socket.on("correct", () => {
        scores.forEach(subarray => {
            if (subarray[0] === socket.id) {
                subarray[1]++;
                subarray[5]++;
            }
        });
        stats.forEach(subarray => {
            if (subarray[0] === getName(socket.id)) {
                subarray[1]++;
            }
        });
        io.emit("update_records", records);
    });

    socket.on("correct", () => {
        scores.forEach(subarray => {
            if (subarray[0] === socket.id) {
                subarray[1]++;
                subarray[5]++;
            }
        });
        io.emit("update_records", records);
    });
*/