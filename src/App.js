import io from 'socket.io-client'
import { useEffect, useState} from "react";
import ButtonSection from './buttonSection';
import PlayerSection from './playerSection';
import ImageSection from './imageSection';
var socket = io({ autoConnect: false });
const IS_PROD = process.env.NODE_ENV === "production";
const URL = IS_PROD ? "http://www.ethananderson.ca/" : "http://localhost:3001";

var myGuess = "";

function App() {
  // states
  const [message, setMessage] = useState("");
  const [messageReceived, setMessageReceived] = useState("");
  const [textSection, setTextSection] = useState("");
  const [image, setImage] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState("");
  const [players, setPlayers] = useState([]);
  const [scores, setScores] = useState([]);

  // player come online
  const playerJoin = (name) => {
    // connect to server
    socket = io.connect(URL);
    // set name on user
    setName(name);
    // update player list on user
    setPlayers(previous => [...previous, name])
    // update player list on peers
    socket.emit("player_join_u", name);
  };

  // start round
  const start = () => {
    socket.emit("get_random_dream_u");
  };

  // player guesses
  const guess = (data) => {
    myGuess = data;
    socket.emit("guess");
    console.log("guesser: " + name);
    console.log("my guess: " + myGuess);
    setStatus("guessed");
  }

  // send message to socket
  const sendMessage = () => {
    socket.emit("send_message", { message, name });
  }

  // socket handlers -----------
  const receiveMessage = (data) => {
    setMessageReceived(data.name + ": " + data.message);
  }

  const playerJoinD = (data) => {
    setPlayers(previous => [...previous, data.data])
  }

  const getRandomDreamD = (data) => {
    setTextSection(data.dream);
    setStatus("during");
    console.log("dreamer: " + data.dreamer);
    setImage(data.dream.split(" ").join("_"));
  }

  // when all players guessed
  const allGuessed = (answer) => {
    if (answer === myGuess) {
      setTextSection("CORRECT\nANSWER: " + answer + "\nYou guessed: " + myGuess);
      socket.emit("increment_score");
    } else {
      setTextSection("INCORRECT\nANSWER: " + answer + "\nYou guessed: " + myGuess);
    }
    setStatus("after");
    setImage("");
  }

  const updateScores = (data) => {
    setScores(data);
  }

  // receive from socket
  useEffect(() => {

    socket.on("receive_message", receiveMessage);
    socket.on("player_join_d", playerJoinD);
    socket.on("get_random_dream_d", getRandomDreamD);
    socket.on("all_guessed", allGuessed);
    socket.on("update_scores", updateScores);

    return () => {
      socket.off("receive_message");
      socket.off("player_join_d");
      socket.off("get_random_dream_d");
      socket.off("all_guessed");
    };

  }, [socket]);

  // display
  return (
    <div className="App container w-60 text-center" style={{whiteSpace: `pre-line`}}>

      <br></br>
      <p>{textSection}</p>
      <ButtonSection name={name} playerJoin={playerJoin} status={status} start={start} guess={guess}/>
      <br></br>

      <PlayerSection name={name} scores={scores} />

      <ImageSection image={image} />

    </div>
  );
}

export default App;

/*
      <h1>Players:</h1>
      <div>
        {players.map(item => {
          return <div>{item}</div>;
        })}
      </div>

      <input 
        placeholder="Message..." 
        onChange={(event) => {
          setMessage(event.target.value);
        }}
      />
      <button onClick={sendMessage}> Send Message</button>

      <h1>Message:</h1>
      {messageReceived}
*/