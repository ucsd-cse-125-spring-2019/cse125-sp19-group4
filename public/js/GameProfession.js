const Fighter = {
    profession: "Fighter",
    status: {
        'STATUS_maxHealth': 100,
        'STATUS_damage': 10,
        'STATUS_defense': 10,
        'STATUS_speed': 10,
    },
    skills: {},
};

const Archer = {
    profession: "Archer",
    status: {
        'STATUS_maxHealth': 100,
        'STATUS_damage': 10,
        'STATUS_defense': 10,
        'STATUS_speed': 10,
    },
    skills: {},
};

const Healer = {
    profession: "Healer",
    status: {
        'STATUS_maxHealth': 100,
        'STATUS_damage': 10,
        'STATUS_defense': 10,
        'STATUS_speed': 10,
    },

    skills: {
        0: {
            'name': 'Heal',
            'coolDown': 10,
            'description': 'The healer heals an unit and recovers ' + this.strength + ' per second',
            'iconPath': '/public/images/skills/SKILL_Heal.png',
            'strength': 10,
            'function': function () {
                // TODO
            }, 
        },

        1: {
            'name': 'MakeMedicine',
            'coolDown': 10,
            'description': 'The healer makes a medicine that recovers ' + this.strenth + ' health for an unit',
            'strength': 10,
            'iconPath': '/public/images/skills/SKILL_Medicine.png',
            'function': function () {
                // TODO
            }, 
        },

        2: {
            'name': '',
            'coolDown': 10,
            'description': 'a',
            'iconPath': 'a',
            'function': function () {
                // TODO
            }, 
        },

        3: {
            'name': 'Surgery',
            'coolDown': 300,
            'description': 'The healer performs a surgery on a near-death person and revives him. Surgery takes a while to finish. The healer can only perform surgery once a while because it is exhausting',
            'iconPath': '/public/images/skills/SKILL_Surgery.png',
            'function': function () {
                // TODO
            }, 
        },
    },
};

const Builder = {
    profession: "Builder",
    status: {
        'STATUS_maxHealth': 100,
        'STATUS_damage': 10,
        'STATUS_defense': 10,
        'STATUS_speed': 10,
    },
    skills: {},
};

function initializeProfession(survivor, msg) {
    let profession = null;
    switch(msg) {
        case "Fighter":
            profession = Fighter;
            break;
        case "Archer":
            profession = Archer;
            break;
        case "Healer":
            profession = Healer;
            break;
        case "Builder":
            profession = Builder;
            break;
    }
    survivor.skills = profession.skills;
    survivor.profession = profession.profession;
    survivor.status = profession.status;
    survivor.status.STATUS_curHealth = profession.status.STATUS_maxHealth;
    Object.keys(survivor.skills).forEach((e) => {
        survivor.skills[e].curCoolDown = 0;
    });
}

module.exports.initializeProfession = initializeProfession;