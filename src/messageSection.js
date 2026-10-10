import React, { useEffect, useRef } from "react";

function MessageSection(props) {
    
    let messages = props.messages;

    const inputRef = useRef(null);
    const messageBoxRef = useRef(null);

    useEffect(() => {
        if (window.matchMedia("(min-width: 1050px)").matches && messageBoxRef.current) {
            messageBoxRef.current.scrollTop = messageBoxRef.current.scrollHeight;
        }
    }, [props.messages.length]);

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
            <div id="messageSection">
                <div className="roundCount">Round: {props.roundNumber}</div>
                <div id="messageBox" className="message" ref={messageBoxRef}>
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