const { Item, Slime, Tile, Bullet, Tree } = require("./GameUnits.js").Units;
const glMatrix = require("gl-Matrix");
const items = require("./items.js");
const buff = {
    'damage': 0,
    'defense': 0,
    'speed': 0,
    'attackSpeed': 0
}

const SKILL_TYPE = {
    SELF: "SELF",
    OTHERS: "OTHERS",
    LOCATION: "LOCATION",
    ONGOING: "ONGOING"
}

class onGoingSkill {
    constructor(duration, effect, invoker) {
        this.duration = duration;
        this.effect = effect;
        this.invoker = invoker;
    }
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
        this.baseStatus = {};
        this.status = {};
        this.buff = JSON.parse(JSON.stringify(buff));
        this.items = JSON.parse(JSON.stringify(items));
        this.attackTimer = 0;
    }

    onHit(game, damage) {
        this.status.curHealth = Math.max(this.status.curHealth - damage, 0);
        this.KEYS.push('status');
        game.toSend.push(this.name);
    }

    // Here item is the name of the item
    itemEnhance(item) {
        this.items[item].count += 1;
        items[item].enhance(this.buff, this.status); //TODO two ways to update buff, one is to increament for each item, 
                                             // the other is to sum all items each time. PICK ONE 
        this.KEYS.push("items");
        this.KEYS.push("buff");
        this.KEYS.push("status");
        this.KEYS.push("baseStatus");
        this.KEYS.push("buff");
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
        this.model = '';
        this.radius = 2;
        this.skills = {
            0: {
                'name': 'Slime',
                'coolDown': 1,
                'curCoolDown': 0,
                'maxCharge': 5,
                'curCharge': 0,
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
                'maxCharge': 5,
                'curCharge': 0,
                'iconPath': '/public/images/skills/SKILL_Slime.png',
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
                'maxCharge': 5,
                'curCharge': 0,
                'iconPath': '/public/images/skills/SKILL_Slime.png',
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
            'maxHealth': 100,
            'curHealth': 100,
            'damage': 10,
            'defense': 10,
            'speed': 20,
            'attackInterval': 10,
        };

        this.KEYS = []; // contain a list of property that we want to send to client
    }

    onHit(game, damage) {
    }
}


class Fighter {
    constructor() {
        this.profession = "Fighter";
        this.iconPath = 'public/images/professions/PROFESSION_Fighter.jpg'
        this.status = {
            'maxHealth': 100,
            'curHealth': 100,
            'damage': 10,
            'defense': 10,
            'speed': 10,
            'attackInterval': 60,
            'attackSpeed': 1,
        };
        this.skills = {
            0: {
                'name': 'Attack',
                'type': SKILL_TYPE.LOCATION,
                'coolDown': 0.5,
                'curCoolDown': 0,
                'maxCharge': 5,
                'curCharge': 0,
                'description': 'Shoot an arrow',
                'iconPath': '/public/images/skills/SKILL_Shoot.png',
                'function': function (game, params) {
                    const name = params.name;
                    const cursor = params.position;
                    const direction = glMatrix.vec3.create();
                    glMatrix.vec3.subtract(direction, cursor, game.objects[name].position);
                    direction[1] = 0;
                    glMatrix.vec3.normalize(direction, direction);
                    game.objects[name].direction = direction;
                    game.shoot(name);
                },
            },

            0: {
                'name': 'Attack',
                'type': SKILL_TYPE.LOCATION,
                'coolDown': 0.5,
                'curCoolDown': 0,
                'maxCharge': 5,
                'curCharge': 0,
                'description': 'Shoot an arrow',
                'iconPath': '/public/images/skills/SKILL_Shoot.png',
                'function': function (game, params) {
                    const name = params.name;
                    const cursor = params.position;
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

class Archer {
    constructor() {
        this.profession = "Archer";
        this.status = {
            'maxHealth': 100,
            'curHealth': 100,
            'damage': 10,
            'defense': 10,
            'speed': 10,
            'attackInterval': 60,
            'attackSpeed': 1,
        };
        this.iconPath = 'public/images/professions/PROFESSION_Archer.jpg';
        this.skills = {
            0: {
                'name': 'Shoot',
                'type': SKILL_TYPE.LOCATION,
                'coolDown': 0.5,
                'curCoolDown': 0,
                'maxCharge': 5,
                'curCharge': 0,
                'description': 'Shoot an arrow',
                'iconPath': '/public/images/skills/SKILL_Shoot.png',
                'function': function (game, params) {
                    const name = params.name;
                    const cursor = params.position;
                    const direction = glMatrix.vec3.create();
                    glMatrix.vec3.subtract(direction, cursor, game.objects[name].position);
                    direction[1] = 0;
                    glMatrix.vec3.normalize(direction, direction);
                    game.objects[name].direction = direction;
                    game.shoot(name);
                },
            },
            1: {
                'name': 'Grenade',
                'type': SKILL_TYPE.LOCATION,
                'coolDown': 0.5,
                'curCoolDown': 0,
                'maxCharge': 5,
                'curCharge': 0,
                'description': 'Shoot an arrow',
                'iconPath': '/public/images/skills/SKILL_Shoot.png',
                'function': function (game, params) {
                    const name = params.name;
                    const cursor = params.position;
                    const direction = glMatrix.vec3.create();
                    glMatrix.vec3.subtract(direction, cursor, game.objects[name].position);
                    direction[1] = 0;
                    glMatrix.vec3.normalize(direction, direction);
                    game.objects[name].direction = direction;
                    game.shoot(name);
                },
            },
            2: {
                'name': 'Run',
                'type': SKILL_TYPE.ONGOING,
                'coolDown': 0.5,
                'curCoolDown': 0,
                'maxCharge': 5,
                'curCharge': 0,
                'description': 'Run! Increase speed by 50 for 1 sec',
                'iconPath': '/public/images/skills/SKILL_Shoot.png',
                'function': function (game, params) {
                    const name = params.name;
                    const cursor = params.position;
                    const direction = glMatrix.vec3.create();
                    glMatrix.vec3.subtract(direction, cursor, game.objects[name].position);
                    direction[1] = 0;
                    glMatrix.vec3.normalize(direction, direction);
                    game.objects[name].direction = direction;
                    game.shoot(name);
                },
            },
            3: {
                'name': 'Boost',
                'type': SKILL_TYPE.ONGOING,
                'coolDown': 10,
                'curCoolDown': 0,
                'description': 'Increase attack speed by 200% for 3 seconds',
                'iconPath': '/public/images/skills/SKILL_Shoot.png',
                'function': function (game, self, params) {
                    let duration = 3;
                    let effect = function(game, self) {
                        self.status.attackSpeed = (self.baseStatus.attackSpeed + self.buff.attackSpeed) * 3;
                    };
                    effect(game, self);
                    game.onGoingSkills[self.name + 3] = new onGoingSkill(duration, effect, self);
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
            'maxHealth': 100,
            'curHealth': 100,
            'damage': 10,
            'defense': 10,
            'speed': 10,
            'attackInterval': 60,
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
                'type': SKILL_TYPE.SELF,
                'iconPath': '/public/images/skills/SKILL_Medicine.png',
                'function': function (mySelf) {
                    mySelf.itemEnhance('boots');
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
                    mySelf.status.curHealth = 100;
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
    }
    survivor.skills = profession.skills;
    survivor.profession = profession.profession;
    survivor.status = profession.status;
    let baseStatus = JSON.parse(JSON.stringify(profession.status));
    delete baseStatus.maxHealth;
    delete baseStatus.curHealth
    survivor.iconPath = profession.iconPath;
    for (i in survivor.skills) {
        survivor.skills[i].KEYS = ['coolDown', 'curCoolDown', 'curCharge', 'maxCharge'];
    }
}

module.exports.initializeProfession = initializeProfession;
module.exports.SKILL_TYPE = SKILL_TYPE;
module.exports.Survivor = Survivor;
module.exports.God = God;