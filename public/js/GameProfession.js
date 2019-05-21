const { Item, Slime, Tile, Bullet, Tree } = require("./GameUnits.js").Units;
const glMatrix = require("gl-Matrix");

const SKILL_TYPE = {
    SELF: "SELF",
    OTHERS: "OTHERS",
    LOCATION: "LOCATION",
}

class Survivor {
    constructor(socketid, sid) {
        this.name = 'Survivor ' + sid;
        this.socketid = socketid;
        this.position = [0, 0, 0]; // location (x, y, z)
        this.direction = [0, 0, -1]; // facing (x, y, z)
        this.mass = 500;
        this.maxJump = 2;
        this.jumpSpeed = 8;
        this.model = 'player';
        this.radius = 2;
        this.KEYS = [] // contain a list of property that we want to send to client
        this.profession = {};
        this.skills = {};
        this.status = {};
    }

    onHit(game, damage) {
        this.status.STATUS_curHealth = Math.max(this.status.STATUS_curHealth - damage, 0);
        this.KEYS.push('status');
        game.toSend.push(this.name);
    }
}


class God {
    constructor(socketid) {
        this.name = 'God';
        this.socketid = socketid;
        this.position = [0, 0, 0];
        this.direction = [0, 0, -1]; // facing (x, y, z)
        this.mass = 500;
        this.maxJump = 10;
        this.jumpSpeed = 10;
        this.model = 'player';
        this.radius = 2;
        this.skills = {
            0: {
                'name': 'Slime',
                'coolDown': 1,
                'curCoolDown': 0,
                'iconPath': '/public/images/skills/SKILL_Slime.png',
                'type': SKILL_TYPE.LOCATION,
                'function': function (game, params) {
                    const position = params.position;
                    const slime = new Slime(game.slimeCount, "explode");
                    slime.position = position;
                    slime.position[1] += 2;
                    game.putSlimeOnTheMap(slime);
                },
            },
            1: {
                'name': 'Shooting Slime',
                'coolDown': 1,
                'curCoolDown': 0,
                'type': SKILL_TYPE.LOCATION,
                'function': function (game, params) {
                    const position = params.position;
                    const slime = new Slime(game.slimeCount, "shoot");
                    slime.position = position;
                    slime.position[1] += 2;
                    game.putSlimeOnTheMap(slime);
                },
            },
            2: {
                'name': 'Melee Slime',
                'coolDown': 1,
                'curCoolDown': 0,
                'type': SKILL_TYPE.LOCATION,
                'function': function (game, params) {
                    const position = params.position;
                    const slime = new Slime(game.slimeCount, "melee");
                    slime.position = position;
                    slime.position[1] += 2;
                    game.putSlimeOnTheMap(slime);
                },
            },
        };
        this.status = {
            'STATUS_maxHealth': 100,
            'STATUS_curHealth': 100,
            'STATUS_damage': 10,
            'STATUS_defense': 10,
            'STATUS_speed': 20,
        };

        this.KEYS = []; // contain a list of property that we want to send to client
    }

    onHit(game, damage) {
        this.status.STATUS_curHealth = Math.max(this.status.STATUS_curHealth - damage, 0);
        this.KEYS.push('status');
        game.toSend.push(this.name);
    }
}


class Fighter {
    constructor() {
        this.profession = "Fighter";
        this.iconPath = 'public/images/professions/PROFESSION_Fighter.jpg'
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
        this.iconPath = 'public/images/professions/PROFESSION_Archer.jpg';
        this.skills = {
            0: {
                'name': 'Shoot',
                'coolDown': 0.5,
                'curCoolDown': 0,
                'description': 'Shoot an arrow',
                'iconPath': '/public/images/skills/SKILL_Shoot.png',
                'function': function (game, params) {
                    const name = params.name;
                    const cursor = params.cursor;
                    const direction = glMatrix.vec3.create();
                    glMatrix.vec3.subtract(direction, cursor, game.objects[name].position);
                    direction[1] = 0;
                    glMatrix.vec3.normalize(direction, direction);
                    game.objects[name].direction = direction;
                    game.shoot(name);
                },
            },
        };
    }
}

class Healer {
    constructor() {
        this.profession = "Healer";
        this.iconPath = 'public/images/professions/PROFESSION_Healer.jpg'
        this.status = {
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
                'name': 'selfHeal',
                'coolDown': 10,
                'curCoolDown': 0,
                'description': 'a',
                'iconPath': 'a',
                'type': SKILL_TYPE.SELF,
                'function': function(mySelf) {
                    mySelf.status.STATUS_curHealth = 100;
                }
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
        this.iconPath = 'public/images/professions/PROFESSION_Builder.jpg'
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
    survivor.iconPath = profession.iconPath;
    for (i in survivor.skills) {
        survivor.skills[i].KEYS = ['coolDown', 'curCoolDown'];
    }
}

module.exports.initializeProfession = initializeProfession;
module.exports.SKILL_TYPE = SKILL_TYPE;
module.exports.Survivor = Survivor;
module.exports.God = God;