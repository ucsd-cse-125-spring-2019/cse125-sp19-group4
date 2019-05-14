class Fighter {
    constructor() {
        this.profession = "Fighter";
        this.status = {
            'STATUS_maxHealth': 100,
            'STATUS_curHealth': 100,
            'STATUS_damage': 10,
            'STATUS_defense': 10,
            'STATUS_speed': 10,
        };
        this.skills = {};
    }
}

class Archer {
    constructor() {
        this.profession = "Archer";
        this.status = {
            'STATUS_maxHealth': 100,
            'STATUS_curHealth': 100,
            'STATUS_damage': 10,
            'STATUS_defense': 10,
            'STATUS_speed': 10,
        };
        this.skills = {};
    }
}

class Healer {
    constructor() {
        this.profession = "Healer";
        this.status= {
            'STATUS_maxHealth': 100,
            'STATUS_curHealth': 100,
            'STATUS_damage': 10,
            'STATUS_defense': 10,
            'STATUS_speed': 10,
        };

        this.skills = {
            0: {
                'name': 'Heal',
                'coolDown': 10,
                'curCoolDown': 0,
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
                'curCoolDown': 0,
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
                'curCoolDown': 0,
                'description': 'a',
                'iconPath': 'a',
                'function': function () {
                    // TODO
                }, 
            },

            3: {
                'name': 'Surgery',
                'coolDown': 300,
                'curCoolDown': 0,
                'description': 'The healer performs a surgery on a near-death person and revives him. Surgery takes a while to finish. The healer can only perform surgery once a while because it is exhausting',
                'iconPath': '/public/images/skills/SKILL_Surgery.png',
                'function': function () {
                    // TODO
                }, 
            },
        };
    }
}

class Builder {
    constructor() {
        this.profession = "Builder";
        this.status = {
            'STATUS_maxHealth': 100,
            'STATUS_curHealth': 100,
            'STATUS_damage': 10,
            'STATUS_defense': 10,
            'STATUS_speed': 10,
        };
        this.skills = {};
    }
}

function initializeProfession(survivor, msg) {
    let profession = null;
    switch(msg) {
        case "Fighter":
            profession = new Fighter();
            break;
        case "Archer":
            profession = new Archer();
            break;
        case "Healer":
            profession = new Healer();
            break;
        case "Builder":
            profession = new Builder();
            break;
    }
    survivor.skills = profession.skills;
    survivor.profession = profession.profession;
    survivor.status = profession.status;
}

module.exports.initializeProfession = initializeProfession;