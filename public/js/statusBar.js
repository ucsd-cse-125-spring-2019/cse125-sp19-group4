// import { uid } from "/public/js/client.js"
const healthBarStyle = "height: 100%; background-color: FireBrick; width: {0}%;"

if (!String.prototype.format) {
    String.prototype.format = function () {
        var args = arguments;
        return this.replace(/{(\d+)}/g, function (match, number) {
            return typeof args[number] != 'undefined'
                ? args[number]
                : match
                ;
        });
    };
}

/* ---------------------------- helper functions --------------------------- */
const invalidStatus = ['STATUS_maxHealth', 'STATUS_curHealth']
function isStatusValid(status) {
    return invalidStatus.indexOf(status) < 0;
}
/* ---------------------------- helper functions --------------------------- */

/* -------------------------Initialize status bar--------------------------- */
function createStatusItem(statusName, initialValue) {
    let div = document.createElement("div");
    let imgSrc = "/public/images/" + statusName + ".png";

    let img = document.createElement("img");
    img.src = imgSrc;
    img.height = 20;
    img.weight = 20;
    img.style = "vertical-align: middle; margin: 2px";
    img.title = statusName;


    let text = document.createElement("span");
    text.id = statusName;
    text.innerHTML = initialValue;
    text.style = "display: inline-block; vertical-align: middle; margin: 0px 5px; color:#B4AE6C;";

    div.appendChild(img);
    div.appendChild(text);
    document.getElementById("statusList").appendChild(div);     // Append <li> to <ul> with id="myList"
}

function InitializeStatus(status) {
    //------------------------health bar---------------------------
    let div = document.createElement("div");
    let img = document.createElement("img");
    img.src = "/public/images/STATUS_maxHealth.png";
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
    healthBar.style = healthBarStyle.format(60);
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

    for (let i in status) {
        if (isStatusValid(i)) {
            createStatusItem(i, status[i])
        }
    }
    //------------------------everything else----------------------
}


function InitializeSkills(skills) {
    for (let i in skills) {
        let skillsBar = document.getElementById("skillsBar");
        let skill = document.createElement('div');
        let mask = document.createElement('div'); // cooldown mask
        mask.style = "background-color: cornflowerblue; height: 0; position: absolute; width: 100%;" +
            "bottom: 0; opacity: 0.8";
        mask.id = i;
        skill.innerHTML = skills[i].name;
        skill.className += "skill";
        skill.appendChild(mask);
        skillsBar.appendChild(skill);
    }
}
/* -------------------------Initialize status bar--------------------------- */



/* --------------------------all update functions--------------------------- */
function timerUpdate(second) {
    let hour = Math.floor(second / 3600);
    let minute = Math.floor(second / 60 % 60);
    minute = ("0" + minute).slice(-2)
    second = Math.floor(second  % 60);
    second = ("0" + second).slice(-2)
    let timeString = hour + ":" + minute + ":" + second;
    document.getElementById("timer").innerHTML = timeString;
}

function statusUpdate(status) {
    for (let i in status) {
        if (i === 'STATUS_curHealth') {
            document.getElementById('healthBar').style = healthBarStyle.format(status[i]);

        } else if (isStatusValid(i)) {
            document.getElementById(i).innerHTML = status[i];
        }
    }
}

function coolDownUpdate(skills) {
    for (let skill in skills) {
        let coolDownPercent = skills[skill].curCoolDown / skills[skill].coolDown * 100;
        let mask = document.getElementById(skill);
        mask.style.height = coolDownPercent + "%";
    }
}
/* --------------------------all update functions--------------------------- */




export { coolDownUpdate, InitializeSkills, InitializeStatus, timerUpdate, statusUpdate }