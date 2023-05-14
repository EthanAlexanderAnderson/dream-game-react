import React, { useRef } from "react";

function MessageSection(props) {
    let link = "";

    const inputRef = useRef(null);

    const handleSubmit = (event) => {
        event.preventDefault();
        console.log("dfgndifn: " + props.message)
        if (props.message) {
            props.sendMessage();
        }
        inputRef.current.value = "";
        props.setMessage("");
    };

    if (props.name !== "") {
        return (
            <div id="messageSection" className='col-sm-3  order-md-1'>

                <div id="messageBox" className="message">
                    <ul>
                    {props.messages.map((item) => (
                        <li key={item}>{item}</li>
                    ))}
                    </ul>
                </div>
            
                <form className="message" onSubmit={handleSubmit}>
                    <input
                    class="form-control"
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