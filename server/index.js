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
let redisResult = "default redisResult value";
let playerCount = 0;
let guessCount = 0;
let scores = [];

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
    console.log(`User Connected: ${socket.id}`);

    socket.on("disconnect", () => {
        console.log("A user disconnected");
        // only decrease playercount if the user had selected a name
        if (scores.some(item => item[0] === socket.id)){
            playerCount--;
        }        
        guessCount = 0;
        if (playerCount < 0){
            playerCount = 0;
        }
        scores = scores.filter(subArr => !subArr.includes(socket.id));
        io.emit("update_scores", scores);
        console.log("Player Count: " + playerCount);
      });
  
    // After new player selects their name
    socket.on("player_join_u", (name) => {
        socket.broadcast.emit("player_join_d", name);
        playerCount++;
        if (!scores.some(item => item[1] === name)){
            scores.push([socket.id, name, 0]);
        }
        console.log("Player Count: " + playerCount);
        io.emit("update_scores", scores);
    });

    // After new player selects their name
    socket.on("get_random_dream_u", (data) => {
        getRandomDream();
    });

    socket.on("guess", () => {
        guessCount++;
        if (guessCount === playerCount){
            console.log("server side all guessed: "+ redisResult);
            io.emit("all_guessed", redisResult);
            guessCount = 0;
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

async function getRandomDream(){
    await redisGet("&dreamcount");
    let count = parseInt(redisResult);
    let rng = Math.floor(Math.random() * Math.floor(count));
    await redisGet("&dream"+rng);
    let dream = redisResult;
    await redisGet("&dreamer"+rng);
    let dreamer = redisResult;
    io.emit("get_random_dream_d", { dream, dreamer} );
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