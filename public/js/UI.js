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
    healthBar.style = healthBarStyle.format(100);
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
    statusUpdate(status);
}


function InitializeSkills(skills) {
    let skillBarDiv = document.createElement('div');
    skillBarDiv.id = "skillBarDiv";
    let skillsBar = document.createElement('ul');
    skillsBar.id = "skillsBar";
    skillBarDiv.appendChild(skillsBar);
    document.getElementById("statusBar").appendChild(skillBarDiv);
    for (let i in skills) {
        let skillsBar = document.getElementById("skillsBar");
        let skill = document.createElement('div');
        let img = document.createElement('img');
        img.src = skills[i].iconPath;
        img.style = "width: 100%; height: 100%"
        img.title = skills[i].description;
        let mask = document.createElement('div'); // cooldown mask
        mask.style = "background-color: cornflowerblue; height: 0; position: absolute; width: 100%;" +
                     "bottom: 0; opacity: 0.8";
        let span = document.createElement('span');
        span.style = "color: white; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);" + 
                     "font-size: 10pt;";
        span.id = i + 'Countdown';
        mask.id = i + 'Mask';
        skill.className += "skill";
        skill.appendChild(img);
        skill.appendChild(mask);
        skill.appendChild(span);
        skillsBar.appendChild(skill);
    }
}


const teammatesName = []
function InitializeTeammates(Survivors) {
    let teammates = document.getElementById("teammatesBar");
    for (let key in Survivors) {
        let survivor = Survivors[key]
        if (survivor.name === "God") {
            continue;
        }
        teammatesName.push(survivor.name)

        let teammate = document.createElement('div');
        teammate.className += "teammate";

        let img = document.createElement('img');
        img.src = survivor.iconPath;
        img.id = survivor.name + "Icon";
        img.style = "width: 100%; height: 100%; box-shadow: 0 0 3px; border: 2px solid saddlebrown;"

        let name = document.createElement('span');
        name.style = "color: white; font-size: 8pt; white-space: nowrap; left: 50%; transformation: translateX(-50%)";
        name.innerHTML = survivor.name;

        let healthBar = document.createElement("div");
        healthBar.id = survivor.name + "healthBar";
        healthBar.className += "progress-bar";
        healthBar.role = "progressbar";
        healthBar.style = healthBarStyle.format(100);
        healthBar["aria-valuemin"] = "0";
        healthBar["aria-valuemax"] = "100";
        healthBar["aria-valuenow"] = "50";

        let health = document.createElement("div");
        health.className += "progress"
        health.style = "display: inline-block; vertical-align: middle; width: 100%; height: 10px; border-radius: 2px;" +
                       "background-color: IndianRed; margin: 3px 0 2px 0;"
        health.background = "black";
        health.appendChild(healthBar);

        teammate.appendChild(img);
        teammate.appendChild(health);
        teammate.appendChild(name)
        teammatesBar.appendChild(teammate);
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
            const curHealth = status.STATUS_curHealth;
            const maxHealth = status.STATUS_maxHealth;
            const width = Math.floor(curHealth / maxHealth * 100);
            document.getElementById('healthBar').style = healthBarStyle.format(width);
            document.getElementById('healthBar').innerHTML = Math.floor(status[i]) + "/" + status['STATUS_maxHealth'];
        } else if (isStatusValid(i)) {
            document.getElementById(i).innerHTML = status[i];
        }
    }
}

function coolDownUpdate(skills) {
    for (let skill in skills) {
        let coolDownPercent = skills[skill].curCoolDown / skills[skill].coolDown * 100;
        let mask = document.getElementById(skill + "Mask");
        let span = document.getElementById(skill + "Countdown");
        mask.style.height = coolDownPercent + "%";
        if (skills[skill].curCoolDown <= 0) {
            span.innerHTML = "";
        } else if (skills[skill].curCoolDown > 1) {
            span.innerHTML = Math.round(skills[skill].curCoolDown) + "s";
        } else {
            span.innerHTML = Math.round(skills[skill].curCoolDown * 10) / 10 + "s";
        }
    }
}

function teammatesUpdate(data) {
    for (let i in teammatesName) {
        const name = teammatesName[i];
        if (name in data) {
            const player = data[name];
            if ('status' in player) {
                const curHealth = player.status.STATUS_curHealth;
                const maxHealth = player.status.STATUS_maxHealth;
                const width = Math.floor(curHealth / maxHealth * 100);
                document.getElementById(name + 'healthBar').style = healthBarStyle.format(width);
                // document.getElementById('healthBar').innerHTML = Math.floor(status[i]) + "/" + status['STATUS_maxHealth'];
            }
        }
    }
}

function teammateDied(teammate) {
    let img = document.getElementById(teammate + "Icon");
    img.style.filter = "grayscale(70%)";
}

function teammateRevived(teammate) {

}
/* --------------------------all update functions--------------------------- */




export { coolDownUpdate, InitializeSkills, InitializeStatus, timerUpdate, statusUpdate, InitializeTeammates,
         teammatesUpdate, teammateDied, teammateRevived }