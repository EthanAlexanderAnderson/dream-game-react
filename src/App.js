import io from 'socket.io-client'
import { useEffect, useState} from "react";
import ButtonSection from './buttonSection';
import PlayerSection from './playerSection';
import ImageSection from './imageSection';
import MessageSection from './messageSection';
import ProfileSection from './profileSection';
import Timer from './timer';
import Leaderboard from './leaderboard';
import RankSection from './rankSection';
var socket = io({ autoConnect: false });
const IS_PROD = process.env.NODE_ENV === "production";
const URL = IS_PROD ? "http://www.ethananderson.ca/" : "http://localhost:3001";

var myGuess = "";
var answer = "";
var gnome = false;
let names = ["Ethan", "Cole", "Nathan", "Oobie", "Devon", "Mitch", "Max", "Adam", "Eric", "Dylan", "Jack", "Devo", "Zach", "Ailís", "Guest"]
// these three variables are used to calculate the timer intervals
let position = 0;
let difficulty = 0;
let rank = 999;

const gnomeSFX = new Audio('gnome.mp3');
// ping sound effect by AndreWharn
const ping = new Audio('ping.mp3');
// tick sound effect by FoolBoyMedia
const tick = new Audio('tick.mp3');

function App() {
  // states
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [textSection, setTextSection] = useState("");
  const [textSectionTwo, setTextSectionTwo] = useState("");
  const [resultSection, setResultSection] = useState("");
  const [difficultyString, setDifficultyString] = useState("");
  const [image, setImage] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState("password");
  //const [players, setPlayers] = useState([]); 
  const [scores, setScores] = useState([]);
  const [stats, setStats] = useState([]);
  const [PFPs, setPFPs] = useState([]);
  const [timerTrigger, setTimerTrigger] = useState(0);
  const [disabled, setDisabled] = useState([]);
  const [score, setScore] = useState(0);
  const [averageScore, setAverageScore] = useState(0);
  const [gnomeButtonStatus, setGnomeButtonStatus] = useState(false);
  const [roundNumber, setRoundNumber] = useState(0);

  // player come online
  const playerJoin = (name) => {
    // connect to server
    socket = io.connect(URL);
    // set name on user
    setName(name);
    // update player list on user
    //(previous => [...previous, name])
    // update player list on peers
    socket.emit("player_join", name);
  };

  // start round
  const start = () => {
    socket.emit("get_random_dream_u");
  };

  // toggle gnome mode on or off
  const toggleGnome = () => {
    socket.emit("toggle_gnome");
  };

  const toggleGnomeButtonStatus = (gnomeStatus) => {
    setGnomeButtonStatus(gnomeStatus);
    gnome = gnomeStatus;
  };

  // player guesses
  const guess = (data) => {
    myGuess = data;
    socket.emit("guess", myGuess);
    setStatus("guessed");
    setTimerTrigger(0);
  }

  // send message to socket
  const sendMessage = () => {
    socket.emit("send_message", { message, name });
  }

  // socket handlers -----------
  const receiveMessage = (data) => {
    setMessages(previous => [...previous, (data.name + ": " + data.message)]);
    ping.play();
  }

  //const updatePlayers = (data) => {
  //  setPlayers(previous => [...previous, data.data])
  //}

  const getRandomDreamD = (data) => {
    // input validation on data
    if (typeof data.dreamDifficulty !== 'number') {
      console.log("difficulty is not a number: " + data.dreamDifficulty + " type: " + typeof data.dreamDifficulty);
    }
    if (typeof data.roundNumber !== 'number') {
      console.log("round number is not a number: " + data.roundNumber + " type: " + typeof data.roundNumber);
    } else {
      setRoundNumber(data.roundNumber);
    }

    setTextSection(data.dream);
    setResultSection("");
    setImage(data.dream.split(" ").join("_").replace(/[ &?]/g, ""));

    //console.log("round number: "+ data.roundNumber + " difficulty: " + data.dreamDifficulty);


    if (data.dreamDifficulty <= -3) {
      setDifficultyString("Trivial");
    } else if (data.dreamDifficulty >= -2 && data.dreamDifficulty <= 0) { 
      setDifficultyString("Very Easy");
    } else if (data.dreamDifficulty >= 1 && data.dreamDifficulty <= 3) {
      setDifficultyString("Easy");
    } else if (data.dreamDifficulty >= 4 && data.dreamDifficulty <= 6) {
      setDifficultyString("Medium");
    } else if (data.dreamDifficulty >= 7 && data.dreamDifficulty <= 9) {
      setDifficultyString("Hard");
    } else if (data.dreamDifficulty >= 10 && data.dreamDifficulty <= 12) {
      setDifficultyString("Very Hard");
    } else if (data.dreamDifficulty >= 13) {
      setDifficultyString("Impossible");
    } else {
      setDifficultyString("Unknown");
    }

    // for timer
    answer = data.dreamer;
    myGuess = "";
    difficulty = data.dreamDifficulty;
    // set timer length based on dream length
    setTimerTrigger(Math.floor(data.dream.length/15)+1);
    //console.log("timer trigger: " + Math.floor(data.dream.length/15));

    for (let i = 0; i < stats.length; i++) {
      if (stats[i][0] === name){
        rank = stats[i][7];
      }
    }
    //console.log("rank: " + rank + " difficulty: " + difficulty);
    // get player score and average score
    let total = 0;
    for (let i = 0; i < scores.length; i++) {
      if (scores[i][1] === name){
        position = i;
      }
      total += scores[i][2];
    }
    let average = total / scores.length;
    setAverageScore(average);
    setScore(scores[position][2]);

    // gnome mode
    if (gnome) {
      const split = data.dream.split(' ');
      // if dream is long enough and 20% chance is reached (gnomeChance can be 0 to 4)
      if (split.length > 16 && data.gnomeChance === 0) {
        for (let i = (Math.floor(split.length / 2)); i < (split.length - 5); i++) {
          if (split[i].length === 5) {
            setTextSection(split.slice(0, i).join(" ") + " ");
            setTextSectionTwo(split.slice(i+1, split.length).join(" "));
            answer = "Gnome";
            break
          }
        }
      }
    }
    setStatus("during");
  }

  // when all players guessed
  const allGuessed = (answer) => {
    if (answer === myGuess) {
      setResultSection("CORRECT\nANSWER: " + answer + "\nYou guessed: " + myGuess + "\nNext round starts in 5 seconds...");
      socket.emit("correct", name);
    } else {
      setResultSection("INCORRECT\nANSWER: " + answer + "\nYou guessed: " + myGuess + "\nNext round starts in 5 seconds...");
      socket.emit("incorrect", name);
      if (answer === "Gnome") {
        gnomeJumpscare();
      }
    }
    setTextSection("");
    setStatus("after");
    setImage("");
    myGuess = "";
    setDisabled([]);
    setTimeout(start, 5000);
  }

  const updateScores = (data) => {
    setScores(data);
    for (let i = 0; i < data.length; i++) {
      if (data[i][1] === name) {
          position = i;
          //console.log("name: " + name + "   pos: " + position);
      }
    }
  }

  const updateStats = (data) => {
    setStats(data);
  }

  const updatePFPs = (data) => {
    setPFPs(data);
  }

  const disableRandomButton = () => {
    let randomNumber = Math.floor(Math.random() * 13);
    let attemps = 0;
    while ((names[randomNumber] === answer || disabled.includes(randomNumber)) && attemps < 1000) {
      randomNumber = Math.floor(Math.random() * 13);
      attemps++;
    }
    setDisabled(prevArray => [...prevArray, randomNumber]);
    setDisabled(prevArray => [...prevArray].sort((a, b) => a - b));
  }

  const gnomeJumpscare = () => {
    gnomeSFX.play();
    var jumpscare = document.getElementById("jumpscare");
    jumpscare.classList.add("show");
    setTimeout(function(){ jumpscare.classList.remove("show"); }, 1500);
  }

  // receive from socket
  useEffect(() => {

    socket.on("receive_message", receiveMessage);
    //socket.on("update_players", updatePlayers);
    socket.on("get_random_dream_d", getRandomDreamD);
    socket.on("all_guessed", allGuessed);
    socket.on("update_scores", updateScores);
    socket.on("update_stats", updateStats);
    socket.on("update_PFPs", updatePFPs);
    socket.on("toggle_gnome_button_status", toggleGnomeButtonStatus);
    
    return () => {
      socket.off("receive_message");
      socket.off("player_join_d");
      socket.off("get_random_dream_d");
      socket.off("all_guessed");
      socket.off("update_scores");
      socket.off("update_stats");
      socket.off("update_PFPs");
      socket.off("toggle_gnome_button_status");
    };

  }, [allGuessed, updateScores]);

  // display
  return (
    <div className="App container row mx-auto">

      <div id="jumpscare" className="jumpscare">
          <img src="gnome_256.png" alt="jumpscare gnome" />
      </div>
      
      <div className='col order-sm-2'>
        
        <div id='textSection'>
          <div id="gnomeStatus"  style={{color: "red"}}>{gnome ? "Gnome mode is Active" : ""}</div>
          <div id='resultHeader' style={{color: status === "after" ? resultSection.startsWith("C") ? 'green' : 'red' : 'white', fontWeight: status === "after" ? 'bold' : 'normal'}}>{resultSection.split('\n')[0]}</div>
          <div id='resultBody'>{resultSection.split('\n').slice(1).join('\n')}</div>
          {textSection}
          {answer === "Gnome" && (status === "during" || status === "guessed")  ? (
          <>
            <button id="hidingGnome" onClick={() => guess("Gnome")} disabled={status === "guessed"}>gnome</button> {textSectionTwo}
          </>
          ) : "" }
        </div>

        <div id='difficultySection'>
          <div id='difficultyText' title={difficulty}>{status === "during" ? "Difficulty: " + difficultyString : ""}</div>
        </div>

        <ButtonSection name={name} setStatus={setStatus} playerJoin={playerJoin} status={status} start={start} guess={guess} disabled={disabled} toggleGnome={toggleGnome} gnomeButtonStatus={gnomeButtonStatus}/>

        <Timer trigger={timerTrigger} guess={guess} myGuess={myGuess} status={status} disableRandomButton={disableRandomButton} position={position} difficulty={difficulty} rank={rank} score={score} averageScore={averageScore} tick={tick}/>

        <PlayerSection name={name} scores={scores} stats={stats} status={status} PFPs={PFPs}/>

        <ImageSection image={image} status={status}/>

      </div>

      {name !== "" ? ( // only render this section after name is set
        <div className='col-sm-3 order-1'  style={{ padding: "0px" }}>
          <MessageSection name={name} setMessage={setMessage} sendMessage={sendMessage} message={message} messages={messages} roundNumber={roundNumber}/>

          <RankSection stats={stats} PFPs={PFPs}/>
        </div>
      ) : null }

      {name !== "" ? ( // only render this section after name is set
        <div className='col-sm-3 order-3'  style={{ padding: "0px" }}>
          <ProfileSection name={name} stats={stats} PFPs={PFPs}/>

          <Leaderboard stats={stats} PFPs={PFPs}/>
        </div>
      ) : null }
    </div>
  );
}

export default App;