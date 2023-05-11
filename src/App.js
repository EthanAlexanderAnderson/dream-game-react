import io from 'socket.io-client'
//import Buffer from 'buffer';
//import Crypto from 'crypto';
//import Redis from 'redis';
import { useEffect, useState} from "react";
import NameButtons from './nameButtons';
const socket = io.connect("http://localhost:3001")

function App() {
  // states
  const [message, setMessage] = useState("");
  const [messageReceived, setMessageReceived] = useState("");
  const [textSection, setTextSection] = useState("Welcome to Dream Game.\nPlease select your name:");
  const [name, setName] = useState("");
  const [status, setStatus] = useState("");
  const [players, setPlayers] = useState([]);
  //const [myGuess, setMyGuess] = useState("");
  let myGuess = "";
  const [guessed, setGuessed] = useState([]);
  //const [dreamer, setDreamer] = useState("");

  let dreamer = "";

  // player come online
  const playerJoin = (data) => {
    // set name on user
    setName(data);
    // update player list on user
    setPlayers(previous => [...previous, data])
    // update player list on peers
    socket.emit("player_join_u", { data });
  };

  // start round
  const start = () => {
    socket.emit("get_random_dream_u");
  };

  // player guesses
  const guess = (data) => {
    //console.log(data);
    //setMyGuess(data);
    myGuess = data;
    console.log(myGuess);
    socket.emit("guess_u", name);
  }

  // send message to socket
  const sendMessage = () => {
    socket.emit("send_message", { message, name });
  }

  const end = () => {
    console.log("asdasdasdada "+myGuess);
  };

  // receive from socket
  useEffect(( myGuess ) => {

    socket.on("receive_message", (data) => {
      var message = data.message;
      var name = data.name;
      setMessageReceived(name + ": " + message);
    });

    socket.on("player_join_d", (data) => {
      setPlayers(previous => [...previous, data.data])
    });

    socket.on("get_random_dream_d", (data) => {
      setTextSection(data.dream);
      setStatus("during");
      //setDreamer(data.dreamer);
      dreamer = data.dreamer;
      console.log("dreamer: " + data.dreamer);
    });

    socket.on("guess_d", (data) => {
      setGuessed(previous => [...previous, data]);
      console.log("guessed: " + data);
      
    });

    socket.on("all_guessed", (data) => {
      if (data.redisResult === data.guess) {
        setTextSection("CORRECT\nANSWER: " + data.redisResult + "\nYou guessed: " + data.guess);
      } else {
        setTextSection("INCORRECT\nANSWER: " + data.redisResult + "\nYou guessed: " + data.guess);
      }
      setStatus("after");
    });

    return () => {
      socket.off("player_join_d");
      socket.off("get_random_dream_d");
      socket.off("guess_d");
      socket.off("all_guessed");
    };

  }, [socket]);

  // display
  return (
    <div className="App" style={{whiteSpace: `pre-line`}}>

      <h1>Name: {name}</h1>
      <br></br>

      <p>{textSection}</p>
      <NameButtons name={name} playerJoin={playerJoin} status={status} start={start} guess={guess}/>
      <br></br>

      <h1>Players:</h1>
      <div>
        {players.map(item => {
          return <div>{item}</div>;
        })}
      </div>
      <h1>{dreamer}</h1>

    </div>
  );
}

export default App;

/*

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