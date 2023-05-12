import React from "react";

function ImageSection(props) {
    let link = "";
    if (props.image.includes("https")) {
        link = props.image.split("_").find(substring => substring.startsWith("https"));
    } else {
        link = "https://image.pollinations.ai/prompt/"+props.image;
    }
    
    return (
        <div style={{height: "600px"}}>
            <img src={link} alt="" className="w-75 mh-100" style={{ objectFit: "contain"}}></img>
        </div>
    );
};
export default ImageSection;