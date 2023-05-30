import React from "react";

function ImageSection({image, status}) {
    let link = "";
    // if dream contains an image link, display that image
    if (image.includes("https")) {
        link = image.split("_").find(substring => substring.startsWith("https"));
    } 
    // else, generate AI image
    else {
        link = "https://image.pollinations.ai/prompt/"+image;
    }
    
    // only show image while people are guessing
    if (status === "during" || status === "guessed" ) {return (
        <div id="imageSection">
            <img src={link} alt="" className="img-fluid"></img>
        </div>
    );}
};
export default ImageSection;