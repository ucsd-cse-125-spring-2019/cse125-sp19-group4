const properties = ['attackPoint', 'defense', 'movementSpeed'];
const imgSrcs = ["attackPoint.png","defense.png","speed.png"];
import { uid } from "./client.js"
const healthBarStyle = "height: 100%; background-color: FireBrick; width: {0}%;"

if (!String.prototype.format) {
    String.prototype.format = function() {
        var args = arguments;
        return this.replace(/{(\d+)}/g, function(match, number) { 
        return typeof args[number] != 'undefined'
            ? args[number]
            : match
        ;
        });
    };
}

function createStatusItem(textId, imgSrc) {
    let div = document.createElement("div");   

    let img = document.createElement("img");
    img.src = imgSrc;
    img.height = 20;
    img.weight = 20;
    img.style = "vertical-align: middle; margin: 2px";
    img.title = textId;


    let text = document.createElement("span"); 
    text.id = textId;
    text.innerHTML = "0";
    text.style = "display: inline-block; vertical-align: middle; margin: 0px 5px; color:#B4AE6C;";

    div.appendChild(img);
    div.appendChild(text);
    document.getElementById("statusList").appendChild(div);     // Append <li> to <ul> with id="myList"
}

function loadStatusList() {
    //------------------------health bar---------------------------
    let div = document.createElement("div"); 
    let img = document.createElement("img");
    img.src = "./public/images/health.png";
    img.height = 20;
    img.weight = 20;
    img.style = "vertical-align: middle; margin: 2px";

    let health = document.createElement("div");
    health.className += "progress"
    health.style = "display: inline-block; vertical-align: middle; width: 100px; background-color: IndianRed; margin: 0px 5px;"
    health.background = "black";

    let healthBar = document.createElement("div");
    healthBar.id = "healthBar";
    healthBar.className += "progress-bar";
    healthBar.role = "progressbar";
    healthBar.style = healthBarStyle.format(40)
    healthBar["aria-valuemin"] = "0";
    healthBar["aria-valuemax"] = "100";
    healthBar["aria-valuenow"] = "50";

    health.appendChild(healthBar);
    div.appendChild(img);
    div.appendChild(health);
    document.getElementById("statusBar").appendChild(div);
    //------------------------health bar---------------------------

    //------------------------everything else----------------------
    let ul = document.createElement("ul");
    ul.id = "statusList";
    ul.style = "margin: 0px;";
    document.getElementById("statusBar").appendChild(ul);
    
    for (let i = 0; i < properties.length; i++) {
        createStatusItem(properties[i], "./public/images/" + imgSrcs[i])
    }
    //------------------------everything else----------------------
}
window.loadStatusList = loadStatusList; // So that index.html has access to it

document.addEventListener("timerUpdate", function(e) {
    let milisecs = JSON.parse(e.detail);
    let hour = Math.floor(milisecs / 3600000);
    let minute = Math.floor(milisecs / 60000 % 60);
    minute = ("0" + minute).slice(-2)
    let second = Math.floor(milisecs / 1000 % 60);
    second = ("0" + second).slice(-2)
    let timeString = hour + ":" + minute + ":" + second;
    document.getElementById("timer").innerHTML = timeString;
    document.getElementById("healthBar").style = healthBarStyle.format(milisecs % 80);//TODO remove
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