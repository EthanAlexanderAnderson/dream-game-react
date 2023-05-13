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

// dreamgame variables
let redisResult = "default_redisResult_value";
let playerCount = 0;
let guessCount = 0;
let scores = [];
let status = "before";

const io = new Server(server, {
    cors: {
      //origin: "http://localhost:3000", // FOR LOCAL
      origin: ["http://localhost:3000", "https://dreamgame.herokuapp.com/", "http://www.ethananderson.ca/"], // FOR PROD
      methods: ["GET", "POST"],
    },
});

// Real epic stuff starts here --------------------------------
// receiving socket stuff goes in this func
io.on("connection", (socket) => {

    socket.on("disconnect", () => {
        const name = scores.find(subarray => subarray[0] === socket.id);
        if (Array.isArray(name)) {console.log(`User Disconnected: ${socket.id} ${name[1]}`);}
        // only decrease playercount if the user had selected a name
        if (scores.some(item => item[0] === socket.id)){
            playerCount--;
            // prevents bricking from mid-round leavers
            if (guessCount === playerCount){
                console.log("server side all guessed: "+ redisResult);
                io.emit("all_guessed", redisResult);
                guessCount = 0;
                status = "after";
            }
        }        
        if (playerCount < 0){
            playerCount = 0;
        }
        scores = scores.filter(subArr => !subArr.includes(socket.id));
        io.emit("update_scores", scores);
        console.log("Player Count: " + playerCount);
      });
  
    // After new player selects their name
    socket.on("player_join_u", (name) => {
        console.log(`User Connected: ${socket.id} ${name}`);
        socket.broadcast.emit("player_join_d", name);
        if (!scores.some(item => item[1] === name)){
            playerCount++;
            scores.push([socket.id, name, 0, "Waiting..."]);
        }
        console.log("Player Count: " + playerCount);
        io.emit("update_scores", scores);
    });

    // After new player selects their name
    socket.on("get_random_dream_u", (data) => {
        // this if statement with new/refresh stops mid-round joiners from triggering new dream
        if (!(status === "during")){
            getRandomDream("new", socket);
            status = "during";
            setReady("all", "Waiting...");
            io.emit("update_scores", scores);
        } else {
            getRandomDream("refresh", socket);
        }
    });

    socket.on("guess", () => {
        guessCount++; 
        setReady(socket, "Ready");
        io.emit("update_scores", scores);
        if (guessCount === playerCount){
            console.log("Server side all guessed. Dreamer: "+ redisResult);
            io.emit("all_guessed", redisResult);
            guessCount = 0;
            status = "after";
        }
    });

    socket.on("send_message", (data) => {
        var message = data.message;
        var name = data.name;
        socket.broadcast.emit('receive_message', { message, name });
    });

    socket.on("increment_score", () => {
        scores = scores.map(subArr => subArr.map((el, i) => i === 2 && subArr[0] === socket.id ? el + 1 : el));
        io.emit("update_scores", scores);
    });
});

server.listen(process.env.PORT || 3001, () => {
    console.log("SERVER IS RUNNING");
});

// helper funcs -----------------------------
async function redisGet(key) {
    let out = client.get(key);
    await out.then(function(result) {
        redisResult = result;
      })
}
var dream = "";
var dreamer = "";
async function getRandomDream(type, socket){
    if (type === "new") {
        await redisGet("&dreamcount");
        let count = parseInt(redisResult);
        let rng = Math.floor(Math.random() * Math.floor(count));
        await redisGet("&dream"+rng);
        dream = redisResult;
        await redisGet("&dreamer"+rng);
        dreamer = redisResult;
        io.emit("get_random_dream_d", { dream, dreamer} );
    } else {
        socket.emit("get_random_dream_d", { dream, dreamer} );
    }
}

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

/* notes
alright so
any time you want to ping redis for fucking anything
you need to use async and await
so
have your socket.on call some random async function
(IT CAN'T DO ANYTHING ELSE)
and then have that random async function do your dirty work
and use await for every redisGet
then get the return of redisGet from redisResult variable
*/