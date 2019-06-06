// import { uid } from "/public/js/client.js"
const healthBarStyle = "height: 100%; background-color: FireBrick; width: {0}%;";
const NOTIFICATION_BASE_STYLE = "transition: font-size 0.5s;";
const NOTIFICATION_STYLE = {
    EVENT: NOTIFICATION_BASE_STYLE +  "color: red",
}

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
const invalidStatus = ['maxHealth', 'curHealth', 'attackInterval']
function isStatusValid(status) {
    return invalidStatus.indexOf(status) < 0;
}
/* ---------------------------- helper functions --------------------------- */

/* -------------------------Initialize status bar--------------------------- */
function createStatusItem(statusName, initialValue) {
    let div = document.createElement("div");
    let imgSrc = "/public/images/status/" + statusName + ".png";

    let img = document.createElement("img");
    img.src = imgSrc;
    img.height = 30;
    img.weight = 30;
    img.style = "vertical-align: middle; margin: 2px";
    img.title = statusName;


    let text = document.createElement("span");
    text.id = statusName;
    text.innerHTML = initialValue;
    text.style = "display: inline-block; vertical-align: middle; margin: 0 0 0 5px; color:#B4AE6C; font-size: 14pt;";

    let buff = document.createElement("span");
    buff.id = "buff" + statusName;
    buff.innerHTML = "+0"
    buff.style = "display: inline-block; margin: 0 0 0 5px; color:green; font-size: 11pt";

    let tempbuff = document.createElement("span");
    tempbuff.id = "tempbuff" + statusName;
    tempbuff.innerHTML = ""
    tempbuff.style = "display: inline-block; margin: 0 0 0 5px; color:red; font-size: 11pt";

    div.appendChild(img);
    div.appendChild(text);
    div.appendChild(buff);
    div.appendChild(tempbuff);
    document.getElementById("statusList").appendChild(div);     // Append <li> to <ul> with id="myList"
}

function InitializeStatus(status) {
    //------------------------health bar---------------------------
    let div = document.createElement("div");
    let img = document.createElement("img");
    img.src = "/public/images/status/maxHealth.png";
    img.height = 25;
    img.weight = 25;
    img.style = "vertical-align: middle; margin: 2px";

    let health = document.createElement("div");
    health.className += "progress"
    health.style = "display: inline-block; vertical-align: middle; width: 100px; background-color: IndianRed; margin: 0px 5px; height: 18px"
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
    healthUpdate(status);
}


function InitializeSkills(skills) {
    let skillBarDiv = document.getElementById('skillBarDiv');
    let skillsBar = document.createElement('ul');
    skillsBar.id = "skillsBar";
    skillBarDiv.appendChild(skillsBar);
    for (let i in skills) {
        let skillsBar = document.getElementById("skillsBar");
        let skill = document.createElement('div');
        skill.id = i + "skill"
        let img = document.createElement('img');
        img.src = skills[i].iconPath;
        img.style = "width: 100%; height: 100%; padding: 8px;"
        
        let mask1 = document.createElement('div'); // cooldown mask
        mask1.style = "background-color: #1b4f72 ; height: 0; position: absolute; width: 100%;" +
                     "bottom: 0; opacity: 0.8; border-radius: 10px";
        mask1.id = i + 'Mask1';

        let mask2 = document.createElement('div'); // cooldown of charge mask
        mask2.style = "background-color: #1b4f72 ; height: 0; position: absolute; width: 100%;" +
                     "bottom: 0; opacity: 0.2; border-radius: 10px";
        mask2.id = i + 'Mask2';

        let span = document.createElement('span');
        span.style = "color: white; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);" + 
                     "font-size: 16pt;";
        span.id = i + 'Countdown';

        let num = document.createElement('span');
        num.innerHTML = parseInt(i) + 1;
        num.style = "position: absolute; left: 50%; transform: translateX(-50%); top: 110%; font-size: 24px; color: white"

        let border1 = document.createElement('div');
        border1.className += "castingAnimation";
        border1.id = i + "skillBorder1"

        let border2 = document.createElement('div');
        border2.className += "castingAnimation";
        border2.style["animation-delay"] = "-2s";
        border2.id = i + "skillBorder2";

        let description = document.createElement('div');
        description.className += "skillDescription"
        description.id = skill.id + "description";

        let descriptionString = "";
        descriptionString += skills[i].name + "<br>";
        descriptionString += "cd: " + skills[i].coolDown + "s <br>";
        if ('maxCharge' in skills[i]) {
            descriptionString += "max charges: " +skills[i].maxCharge + "<br>";
        }
        descriptionString += skills[i].description;
        description.innerHTML = "<span>" + descriptionString + "</span>" ;

        skill.className += "skill";
        skill.appendChild(img);
        skill.appendChild(mask1);
        skill.appendChild(mask2);
        skill.appendChild(span);
        skill.appendChild(border1);
        skill.appendChild(border2);
        skill.appendChild(num);
        skill.appendChild(description);
        skill.addEventListener("mouseenter", skillMouseEnter);
        skill.addEventListener("mouseleave", skillMouseLeave);

        if ('maxCharge' in skills[i]) {
            let charge = document.createElement('span');
            charge.style = "color: white; position: absolute; top: 1px; left: 5px; font-size: 14pt; opacity = 0.9";
            charge.innerHTML = skills[i].curCharge;
            charge.id = i + "charge";
            skill.appendChild(charge);
        }
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
        img.style = "width: 100%; height: 100%; padding: 5px; " // + "background: #00000080; border-radius: 10px"

        let name = document.createElement('span');
        name.style = "color: white; font-size: 12pt; white-space: nowrap; left: 50%; transformation: translateX(-50%)";
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
        health.style = "display: inline-block; vertical-align: middle; width: 100%; height: 10px; border-radius: 4px;" +
                       "background-color: IndianRed; margin: 7px 0 2px 0;"
        health.background = "black";
        health.appendChild(healthBar);

        teammate.appendChild(img);
        teammate.appendChild(health);
        teammate.appendChild(name)
        teammatesBar.appendChild(teammate);
    }
}

function InitializeVault(items) {
    let ul = document.getElementById('vaultUl');
    for (let key in items) {
        let item = items[key];
        let div = document.createElement('div');
        div.className += "item";

        let img = document.createElement('img');
        img.src = 'public/images/items/ITEM_' + key + ".png";
        img.style = "width:100%; height:100%; position: absolute; padding: 6px"
        div.appendChild(img);

        let count = document.createElement('span');
        count.style = "color: white; position: absolute; left: 50%; transform: translateX(-50%); top: 110%; font-size: 10pt;" + 
                      "font-size: 10pt;";
        count.innerHTML = item.count;
        count.id = key + "item";
        div.appendChild(count);

        ul.appendChild(div);
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

function healthUpdate(status) {
    const curHealth = status.curHealth;
    const maxHealth = status.maxHealth;
    const width = Math.floor(curHealth / maxHealth * 100);
    document.getElementById('healthBar').style = healthBarStyle.format(width);
    document.getElementById('healthBar').innerHTML = Math.floor(curHealth) + "/" + maxHealth;
}

function statusUpdate(status) {
    for (let i in status) {
        if (isStatusValid(i)) {
            document.getElementById(i).innerHTML = status[i];
        }
    }
}


function buffUpdate(buff) {
    for (let i in buff) {
        if (isStatusValid(i)) {
            document.getElementById("buff" + i).innerHTML = "+" + buff[i];
        }
    }
}

function tempBuffUpdate(buff) {
    for (let i in buff) {
        if (isStatusValid(i)) {
            if (buff[i] == 0) {
                document.getElementById("tempbuff" + i).innerHTML = "";
            } else {
                document.getElementById("tempbuff" + i).innerHTML = "+" + buff[i];
            }
        }
    }
}

function coolDownUpdate(skills) {
    for (let skill in skills) {
        let mask1 = document.getElementById(skill + "Mask1");
        let mask2 = document.getElementById(skill + "Mask2");
        let span = document.getElementById(skill + "Countdown");

        if (!('maxCharge' in skills[skill]) || skills[skill].curCharge == 0) {
            let coolDownPercent = skills[skill].curCoolDown / skills[skill].coolDown * 100;
            mask1.style.height = coolDownPercent + "%";
            mask2.style.height = 0 + "%";

            if (skills[skill].curCoolDown <= 0) {
                span.innerHTML = "";
            } else if (skills[skill].curCoolDown > 1) {
                span.innerHTML = Math.round(skills[skill].curCoolDown) + "s";
            } else {
                span.innerHTML = Math.round(skills[skill].curCoolDown * 10) / 10 + "s";
            }
        }

        if ('maxCharge' in skills[skill] && skills[skill].curCharge != 0) {
            if (skills[skill].curCharge == skills[skill]. maxCharge) {
                mask2.style.height = 0 + "%";
            } else {
                let coolDownPercent = skills[skill].curCoolDown / skills[skill].coolDown * 100;
                mask2.style.height = coolDownPercent + "%";  
            }
        }

        if ('maxCharge' in skills[skill]) {
            let charge = document.getElementById(skill + 'charge');
            charge.innerHTML = skills[skill].curCharge;
        }
    }
}

function switchCasting(skillNum, hideAll) {
    for (let i = 0; i < 4; i++) {
        document.getElementById(i + "skillBorder1").style.display = "none"; 
        document.getElementById(i + "skillBorder2").style.display = "none";
    }
    if (!hideAll) {
        document.getElementById(skillNum + "skillBorder1").style.display = "block";
        document.getElementById(skillNum + "skillBorder2").style.display = "block";
    }
}

function teammatesUpdate(data) {
    for (let i in teammatesName) {
        const name = teammatesName[i];
        if (name in data) {
            const player = data[name];
            if ('status' in player) {
                const curHealth = player.status.curHealth;
                const maxHealth = player.status.maxHealth;
                const width = Math.floor(curHealth / maxHealth * 100);
                document.getElementById(name + 'healthBar').style = healthBarStyle.format(width);
                // document.getElementById('healthBar').innerHTML = Math.floor(status[i]) + "/" + status['STATUS_maxHealth'];
            }
        }
    }
}

function updateItems(items) {
    let ul = document.getElementById('vaultUl');

    for (let key in items) {
        let item = items[key];

        let count = document.getElementById(key + "item")
        count.innerHTML = item.count;
    }
}

let notificationTimer = null;

function updateNotification(msg, type) {
    let span = document.createElement("div")
    span.innerHTML = msg;
    span.style = NOTIFICATION_STYLE[type];
    document.getElementById('notificationList').appendChild(span);

    setTimeout(function() {
        // span.parentElement.removeChild(span);
        span.style["font-size"] = 0;
        span.style["opacity"] = 0; 
    }, 2000)

    // $("#notification").fadeIn(300);
    // hideTimer = setTimeout(function() {
    //     $("#notification").fadeOut(500);
    // }, 2000)
}

function updateProgressBar(progress) {
    const {curProgress, winProgress} = progress;
    document.getElementById('progressBar').style.width =  curProgress / winProgress * 100 + "%"
}
/* --------------------------all update functions--------------------------- */

function skillMouseEnter(e) {
    let id = e.target.id + 'description';
    let description = document.getElementById(e.target.id + 'description');
    description.style.opacity = 1;
}


function skillMouseLeave(e) {
    let description = document.getElementById(e.target.id + 'description');
    description.style.opacity = 0;
}




export { coolDownUpdate, InitializeSkills, InitializeStatus, timerUpdate, statusUpdate, InitializeTeammates,
         teammatesUpdate, InitializeVault, updateItems, buffUpdate, healthUpdate,
         updateNotification, NOTIFICATION_STYLE , updateProgressBar, tempBuffUpdate, switchCasting
 }