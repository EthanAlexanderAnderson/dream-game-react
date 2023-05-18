import io from 'socket.io-client'
import { useEffect, useState} from "react";
import ButtonSection from './buttonSection';
import PlayerSection from './playerSection';
import ImageSection from './imageSection';
import MessageSection from './messageSection';
import ProfileSection from './profileSection';
var socket = io({ autoConnect: false });
const IS_PROD = process.env.NODE_ENV === "production";
const URL = IS_PROD ? "http://www.ethananderson.ca/" : "http://localhost:3001";

var myGuess = "";

function App() {
  // states
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [textSection, setTextSection] = useState("");
  const [image, setImage] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState("before");
  const [records, setRecords] = useState([]);

  // player come online
  const playerJoin = (name) => {
    // connect to server
    socket = io.connect(URL);
    // set name on user
    setName(name);
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
  }

  // send message to socket
  const sendMessage = () => {
    socket.emit("send_message", { message, name });
  }

  // socket handlers -----------
  const receiveMessage = (data) => {
    setMessages(previous => [...previous, (data.name + ": " + data.message)]);
  }

  const getRandomDreamD = (data) => {
    setTextSection(data.dream);
    setStatus("during");
    setImage(data.dream.split(" ").join("_").replace(/[ &?]/g, ""));
  }

  // when all players guessed
  const allGuessed = (answer) => {
    if (answer === myGuess) {
      setTextSection("CORRECT\nANSWER: " + answer + "\nYou guessed: " + myGuess + "\nNext round starts in 5 seconds...");
      socket.emit("increment_score");
    } else {
      setTextSection("INCORRECT\nANSWER: " + answer + "\nYou guessed: " + myGuess + "\nNext round starts in 5 seconds...");
    }
    setStatus("after");
    setImage("");
    setTimeout(start, 5000);
  }

  const updateRecords = (data) => {
    console.log("request recieved to update records length: " + data.length);
    setRecords(data);
  }

  /*
  const changeFirstIndex = (arr, newValue) => (arr[0][0] = newValue, arr);

  const readyUp = (index) => {
    console.log(index);
    let newValue = "Ready";
    changeFirstIndex(records, 9);
    //temp[index][3] = newValue;
    //setRecords((records, newValue) => (records[index][3] = newValue, records));
    console.log(records);
  }*/

  // receive from socket
  useEffect(() => {

    socket.on("receive_message", receiveMessage);
    socket.on("get_random_dream_d", getRandomDreamD);
    socket.on("all_guessed", allGuessed);
    socket.on("update_records", updateRecords);
    //socket.on("ready_up", readyUp);

    return () => {
      socket.off("receive_message");
      socket.off("get_random_dream_d");
      socket.off("all_guessed");
      socket.off("update_records");

    };

  }, [socket]);

  // display
  return (
    <div className="App container row mx-auto">
      
      <div className='col  order-sm-2'>
        <div id='textSection'>{textSection}</div>
        <ButtonSection name={name} playerJoin={playerJoin} status={status} start={start} guess={guess}/>

        <PlayerSection name={name} records={records} status={status}/>

        <ImageSection image={image} status={status}/>

      </div>

      <MessageSection name={name} setMessage={setMessage} sendMessage={sendMessage} message={message} messages={messages}/>

      <ProfileSection name={name} records={records}/>
 
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