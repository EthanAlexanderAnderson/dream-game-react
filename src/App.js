import io from 'socket.io-client'
import { useEffect, useState} from "react";
import ButtonSection from './buttonSection';
import PlayerSection from './playerSection';
import ImageSection from './imageSection';
import MessageSection from './messageSection';
import ProfileSection from './profileSection';
import Timer from './timer';
var socket = io({ autoConnect: false });
const IS_PROD = process.env.NODE_ENV === "production";
const URL = IS_PROD ? "http://www.ethananderson.ca/" : "http://localhost:3001";

var myGuess = "";
// sound effects by AndreWharn
const ping = new Audio('ping.mp3');

function App() {
  // states
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [textSection, setTextSection] = useState("");
  const [image, setImage] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState("before");
  const [players, setPlayers] = useState([]); 
  const [scores, setScores] = useState([]);
  const [stats, setStats] = useState([]);
  const [PFPs, setPFPs] = useState([]);
  const [timerTrigger, setTimerTrigger] = useState(false);

  // player come online
  const playerJoin = (name) => {
    // connect to server
    socket = io.connect(URL);
    // set name on user
    setName(name);
    // update player list on user
    setPlayers(previous => [...previous, name])
    // update player list on peers
    socket.emit("player_join", name);
  };

  // start round
  const start = () => {
    socket.emit("get_random_dream_u");
  };

  // player guesses
  const guess = (data) => {
    myGuess = data;
    socket.emit("guess", myGuess);
    setStatus("guessed");
    setTimerTrigger(false);
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

  const updatePlayers = (data) => {
    setPlayers(previous => [...previous, data.data])
  }

  const getRandomDreamD = (data) => {
    setTextSection(data.dream);
    setStatus("during");
    setImage(data.dream.split(" ").join("_").replace(/[ &?]/g, ""));

    myGuess = "";
    setTimerTrigger(true);
  }

  // when all players guessed
  const allGuessed = (answer) => {
    if (answer === myGuess) {
      setTextSection("CORRECT\nANSWER: " + answer + "\nYou guessed: " + myGuess + "\nNext round starts in 5 seconds...");
      socket.emit("correct", name);
    } else {
      setTextSection("INCORRECT\nANSWER: " + answer + "\nYou guessed: " + myGuess + "\nNext round starts in 5 seconds...");
      socket.emit("incorrect", name);
    }
    setStatus("after");
    setImage("");
    myGuess = "";
    setTimeout(start, 5000);
  }

  const updateScores = (data) => {
    setScores(data);
  }

  const updateStats = (data) => {
    setStats(data);
  }

  const updatePFPs = (data) => {
    setPFPs(data);
  }

  // receive from socket
  useEffect(() => {

    socket.on("receive_message", receiveMessage);
    socket.on("update_players", updatePlayers);
    socket.on("get_random_dream_d", getRandomDreamD);
    socket.on("all_guessed", allGuessed);
    socket.on("update_scores", updateScores);
    socket.on("update_stats", updateStats);
    socket.on("update_PFPs", updatePFPs);

    return () => {
      socket.off("receive_message");
      socket.off("player_join_d");
      socket.off("get_random_dream_d");
      socket.off("all_guessed");
      socket.off("update_scores");
      socket.off("update_stats");
      socket.off("update_PFPs");
    };

  }, [socket]);

  // display
  return (
    <div className="App container row mx-auto">
      
      <div className='col  order-sm-2'>
        <div id='textSection'>{textSection}</div>
        <ButtonSection name={name} playerJoin={playerJoin} status={status} start={start} guess={guess}/>

        <Timer initialSeconds={30} trigger={timerTrigger} guess={guess} myGuess={myGuess} status={status}/>

        <PlayerSection name={name} scores={scores} stats={stats} status={status} PFPs={PFPs}/>

        <ImageSection image={image} status={status}/>

      </div>

      <MessageSection name={name} setMessage={setMessage} sendMessage={sendMessage} message={message} messages={messages}/>

      <ProfileSection name={name} stats={stats} PFPs={PFPs}/>
 
    </div>
  );
}

export default App;