const properties = ['movementSpeed', 'ap', 'health', 'mana'];
const imgSrcs = ["hammer-nails.png","hammer-nails.png","hammer-nails.png","hammer-nails.png"];
import { uid } from "./client.js"

function createStatusItem(textId, imgSrc) {
    let div = document.createElement("div");   
    let img = document.createElement("img");
    img.src = imgSrc;
    img.height = 15;
    img.weight = 15;
    img.title = textId;


    let text = document.createElement("div"); 
    text.id = textId;
    text.style = "display: inline;"

    div.appendChild(img);
    div.appendChild(text);
    document.getElementById("statusList").appendChild(div);     // Append <li> to <ul> with id="myList"
}

function loadStatusList() {
    let ul = document.createElement("ul");
    ul.id = "statusList";
    document.getElementById("statusBar").appendChild(ul);
    
    for (let i = 0; i < properties.length; i++) {
        createStatusItem(properties[i], "./public/images/" + imgSrcs[i])
    }
}
window.loadStatusList = loadStatusList; // So that index.html has access to it

document.addEventListener("timerUpdate", function(e) {
    let milisecs = JSON.parse(e.detail);
    let hour = Math.floor(milisecs / 3600000);
    let minute = Math.floor(milisecs / 60000 % 60);
    minute = ("0" + minute).slice(-2)
    let second = Math.floor(milisecs / 1000 % 60);
    let timeString = hour + ":" + minute + ":" + second;
    document.getElementById("timer").innerHTML = timeString;
});

/**
 * Here e is the json that contains whatever the server has sent.
 * This function will only update fields that exists in e.
 * For example, if e contains ad: 100, it will udpate ad to 100,
 * if e doesn't contain anything, nothing will happen.
 */
document.addEventListener("statusUpdate", function(e) {
    let player = e.detail[uid];
    for (let i = 0; i < properties.length; i++) {
        let prop = properties[i];
        if (prop in player) {
            document.getElementById(prop).innerHTML = player[prop];
        }
    }
});