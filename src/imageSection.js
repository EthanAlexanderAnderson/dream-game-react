import React from "react";

function ImageSection(props) {
    let link = "";
    if (props.image.includes("https")) {
        link = props.image.split("_").find(substring => substring.startsWith("https"));
    } else {
        link = "https://image.pollinations.ai/prompt/"+props.image;
    }
    
    if (props.status === "during") {return (
        <div id="imageSection">
            <img src={link} alt="" className="img-fluid"></img>
        </div>
    );}
};
export default ImageSection;