import React, { useRef } from "react";

function MessageSection(props) {
    let link = "";

    // max number of messages
    let messages = props.messages.slice(-10);

    //max number of charcters in message box
    let sum = messages.reduce((acc, curr) => acc + curr.length, 0);
    while (sum > 600) {
        let removed = messages.shift();
        sum -= removed.length;
      }

    const inputRef = useRef(null);

    const handleSubmit = (event) => {
        event.preventDefault();
        if (props.message) {
            props.sendMessage();
        }
        inputRef.current.value = "";
        props.setMessage("");
    };

    if (props.name !== "") {
        return (
            <div id="messageSection" className='col-sm-3  order-sm-1'>

                <div id="messageBox" className="message">
                    <ul>
                    {messages.map((item, index) => (
                        <li key={index} className={"mod"+index%2}>{item}</li>
                    ))}
                    </ul>
                </div>
            
                <form className="message" onSubmit={handleSubmit}>
                    <input
                    className="form-control"
                    type="text"
                    placeholder="Message..."
                    ref={inputRef}
                    onChange={(event) => props.setMessage(event.target.value)} />
                    <button id="messageSubmit" className="btn btn-light message" type="submit">Send Message</button>
                </form>


            </div>
        );
    }
};
export default MessageSection;