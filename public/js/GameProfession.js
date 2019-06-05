const { Item, Slime, Tile, Bullet, Ring, Taunted, Tree } = require("./GameUnits.js").Units;
const glMatrix = require("gl-Matrix");
const items = require("./items.js");
const buff = {
    'damage': 0,
    'defense': 0,
    'speed': 0,
    'attackSpeed': 0
}
const server = require('../../server.js')
const Utils = require('./utils')

const SKILL_TYPE = {
    SELF: "SELF",
    OTHERS: "OTHERS",
    LOCATION: "LOCATION",
    SHOOT: "SHOOT",
    ONGOING: "ONGOING",
}

class onGoingSkill {
    constructor(duration, effect, invoker, isSelfBuff, endEffect = null) {
        this.duration = duration;
        this.effect = effect;
        this.invoker = invoker;
        this.isSelfBuff = isSelfBuff;
        this.endEffect = endEffect;
    }
}

class Survivor {
    constructor(socketid, sid) {
        this.name = 'Survivor ' + sid;
        this.type = "player"
        this.dead = false;
        this.socketid = socketid;
        this.position = [0, 0, 0]; // location (x, y, z)
        this.direction = [0, 0, -1]; // facing (x, y, z)
        this.mass = 500;
        this.maxJump = 2;
        this.jumpSpeed = 8;
        this.model = 'player_standing';
        this.radius = 2;
        this.KEYS = [] // contain a list of property that we want to send to client
        this.profession = {};
        this.skills = {};
        this.baseStatus = {};
        this.status = {};
        this.buff = JSON.parse(JSON.stringify(buff));
        this.tempBuff = JSON.parse(JSON.stringify(buff));
        this.items = JSON.parse(JSON.stringify(items));
        this.attackTimer = 0;
    }

    onHit(game, damage) {
        console.log(this.name, 'lost', damage, '*', (100 - this.status.defense) / 100, 'health. Current Health:',
            this.status.curHealth, '/', this.status.maxHealth);
        damage = Math.max(0, Math.floor(damage * (100 - this.status.defense) / 100));
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
                'coolDown': 3,
                'curCoolDown': 0,
                'maxCharge': 5,
                'curCharge': 0,
                'iconPath': '/public/images/skills/SKILL_Slime.png',
                'cursorPath': '/public/images/mouse/empty.cur',
                'type': SKILL_TYPE.LOCATION,
                'function': function (game, self, params) {
                    const position = params.position;
                    const slime = new Slime(game.slimeCount, "explode");
                    slime.position = position;
                    slime.position[1] += 2;
                    return game.putSlimeOnTheMap(slime);
                },
            },
            1: {
                'name': 'Shooting Slime',
                'coolDown': 5,
                'curCoolDown': 0,
                'maxCharge': 5,
                'curCharge': 0,
                'iconPath': '/public/images/skills/SKILL_Slime.png',
                'cursorPath': '/public/images/mouse/empty.cur',
                'type': SKILL_TYPE.LOCATION,
                'function': function (game, self, params) {
                    const position = params.position;
                    const slime = new Slime(game.slimeCount, "shoot");
                    slime.position = position;
                    slime.position[1] += 2;
                    return game.putSlimeOnTheMap(slime);
                },
            },
            2: {
                'name': 'Melee Slime',
                'coolDown': 5,
                'curCoolDown': 0,
                'maxCharge': 5,
                'curCharge': 0,
                'iconPath': '/public/images/skills/SKILL_Slime.png',
                'cursorPath': '/public/images/mouse/empty.cur',
                'type': SKILL_TYPE.LOCATION,
                'function': function (game, self, params) {
                    const position = params.position;
                    const slime = new Slime(game.slimeCount, "melee");
                    slime.position = position;
                    slime.position[1] += 2;
                    return game.putSlimeOnTheMap(slime);
                },
            },
            3: {
                'name': 'Tree',
                'coolDown': 5,
                'curCoolDown': 0,
                'maxCharge': 3,
                'curCharge': 0,
                'iconPath': '/public/images/skills/SKILL_Tree.png',
                'cursorPath': '/public/images/mouse/empty.cur',
                'type': SKILL_TYPE.LOCATION,
                'function': function (game, self, params) {
                    const position = params.position;
                    const tree = new Tree(game.treeId++, 4);
                    tree.position = position;
                    return game.putTreeOnTheMap(tree, false);
                }
            }
        };
        this.status = {
            'maxHealth': 100,
            'curHealth': 100,
            'damage': 10,
            'defense': 10,
            'speed': 40,
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
            'defense': 20,
            'speed': 15,
            'attackInterval': 60,
            'attackSpeed': 1,
        };
        this.skills = {
            0: {
                'name': 'Shoot',
                'sound': 'shoot',
                'type': SKILL_TYPE.SHOOT,
                'coolDown': 0,
                'curCoolDown': 0,
                'description': 'Shoot an arrow',
                'iconPath': '/public/images/skills/SKILL_Shoot.png',
                'function': function (game, self, params) {
                    if (self.attackTimer > 0) {
                        return false;
                    }
                    const name = self.name;
                    const cursor = params.position;
                    const direction = glMatrix.vec3.create();
                    glMatrix.vec3.subtract(direction, cursor, self.position);
                    direction[1] = 0;
                    glMatrix.vec3.normalize(direction, direction);
                    self.direction = direction;
                    game.shoot(name, 50, self.status.damage, 0.2);
                },
            },

            1: {
                'name': 'Cut tree',
                'sound': 'cut',
                'type': SKILL_TYPE.LOCATION,
                'coolDown': 5,
                'curCoolDown': 0,
                'maxCharge': 2,
                'curCharge': 0,
                'description': 'Cut a tree',
                'iconPath': '/public/images/skills/SKILL_CutTree.png',
                'function': function (game, self, params) {
                    const location = params.position;
                    // skill location too far from invoker
                    if (Utils.calculateDistance(self.position, location) > 5) {
                        return false;
                    }

                    const radius = 3;
                    const objsInRadius = game.getObjInRadius(location, radius);
                    let cut = false;
                    objsInRadius.forEach(function (obj) {
                        if (obj.type === "tree") {
                            game.toClean.push(obj.name)
                            cut = true;
                        }
                    })
                    return cut;
                },
            },

            2: {
                'name': 'Shield Wall',
                'sound': 'shield',
                'coolDown': 15,
                'curCoolDown': 0,
                'description': 'Be invulnerable for 3 seconds',
                'iconPath': '/public/images/skills/SKILL_Heal.png',
                'type': SKILL_TYPE.ONGOING,
                'function': function (game, self, params) {
                    const duration = 3;
                    const effect = function (game, self) {
                        self.tempBuff.defense += 100;
                    };
                    game.onGoingSkills[self.name + 2] = new onGoingSkill(duration, effect, self, true);
                },
            },

            3: {
                'name': 'Taunt',
                'sound': 'taunt',
                'type': SKILL_TYPE.ONGOING,
                'coolDown': 15,
                'curCoolDown': 0,
                'description': 'Attract nearby slimes',
                'iconPath': '/public/images/skills/SKILL_CutTree.png',
                'function': function (game, self, params) {
                    const duration = 5;
                    const radius = 30;
                    const tauntedUnit = {};
                        
                    const effect = function (game, self) {
                        const position = self.position;
                        game.objects[self.skill_model].position = position;
                        game.objects[self.skill_model].position[1] += 0.5;
                        const objsInRadius = game.getObjInRadius(position, radius);
                        
                        for (let key in tauntedUnit) {
                            tauntedUnit[key] = false;
                        }

                        objsInRadius.forEach(function (obj) {
                            if (obj.type === "slime") {
                                if (typeof obj.skill_model !== 'undefined' && typeof game.objects[obj.skill_model] !== 'undefined') {
                                    game.objects[obj.skill_model].position = obj.position;
                                    game.objects[obj.skill_model].position[1] += 2;
                                    game.objects[obj.skill_model].direction = obj.direction;
                                } else {
                                    const taunted = new Taunted(obj.position, obj.direction, obj.name);
                                    obj.skill_model = taunted.name;
                                    game.toSend.push(taunted.name);
                                    game.objects[taunted.name] = taunted;
                                }
                                obj.chase(game, self.name);
                                game.toSend.push(obj.name);
                                tauntedUnit[obj.name] = true;
                            }
                        });
                        // reset whose who has been taunted before but no longer being taunted
                        for (let key in tauntedUnit) {
                            if (!tauntedUnit[key]) {
                                delete tauntedUnit[key];
                                const obj = game.objects[key];
                                if (typeof obj !== 'undefined' && typeof obj.skill_model !== 'undefined') {
                                    game.toClean.push(obj.skill_model);
                                    obj.skill_model = '';
                                }
                            }
                        }
                    };
                    const endEffect = function (game, self) {
                        if (typeof self.skill_model !== 'undefined' && typeof game.objects[self.skill_model] !== 'undefined') {
                            game.toClean.push(self.skill_model);
                            self.skill_model = '';
                        }
                        for (let key in tauntedUnit) {
                            const obj = game.objects[key];
                            if (typeof obj !== 'undefined' && typeof obj.skill_model !== 'undefined') {
                                game.toClean.push(obj.skill_model);
                                obj.skill_model = '';
                                delete tauntedUnit[key];
                            }
                        }
                    }
                    game.onGoingSkills[self.name + 3] = new onGoingSkill(duration, effect, self, false, endEffect);

                    // ring model
                    const ring = new Ring(self.position, radius, self.name, 'ring_yellow');
                    self.skill_model = ring.name;
                    game.toSend.push(ring.name);
                    game.objects[ring.name] = ring;
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
            'speed': 20,
            'attackInterval': 60,
            'attackSpeed': 1,
        };
        this.iconPath = 'public/images/professions/PROFESSION_Archer.jpg';
        this.skills = {
            0: {
                'name': 'Shoot',
                'sound': 'shoot',
                'type': SKILL_TYPE.SHOOT,
                'coolDown': 0,
                'curCoolDown': 0,
                'description': 'Shoot an arrow',
                'iconPath': '/public/images/skills/SKILL_Shoot.png',
                'function': function (game, self, params) {
                    if (self.attackTimer > 0) {
                        return false;
                    }
                    const name = self.name;
                    const cursor = params.position;
                    const direction = glMatrix.vec3.create();
                    glMatrix.vec3.subtract(direction, cursor, self.position);
                    direction[1] = 0;
                    glMatrix.vec3.normalize(direction, direction);
                    self.direction = direction;
                    game.shoot(name, 100, self.status.damage, 0.5);
                },
            },
            1: {
                'name': 'Fireball',
                'sound': 'fireball',
                'type': SKILL_TYPE.SHOOT,
                'coolDown': 6,
                'curCoolDown': 0,
                'maxCharge': 2,
                'curCharge': 0,
                'description': 'Throw a grenade and explode',
                'iconPath': '/public/images/skills/SKILL_Grenade.png',
                'function': function (game, self, params) {
                    const name = self.name;
                    const cursor = params.position;
                    const direction = glMatrix.vec3.create();
                    glMatrix.vec3.subtract(direction, cursor, self.position);
                    direction[1] = 0;
                    glMatrix.vec3.normalize(direction, direction);
                    self.direction = direction;
                    game.shoot(name, 50, 40, 1);
                },
            },
            2: {
                'name': 'Sprint',
                'sound': 'sprint',
                'type': SKILL_TYPE.ONGOING,
                'coolDown': 10,
                'curCoolDown': 0,
                'description': 'Run! Increase speed by 100% for 1 sec',
                'iconPath': '/public/images/skills/SKILL_Run.png',
                'function': function (game, self, params) {
                    let duration = 2;
                    let effect = function (game, self) {
                        self.tempBuff.speed += self.baseStatus.speed + self.buff.speed;
                    };
                    game.onGoingSkills[self.name + 2] = new onGoingSkill(duration, effect, self, true);
                },
            },
            3: {
                'name': 'Boost',
                'sound': 'boost',
                'type': SKILL_TYPE.ONGOING,
                'coolDown': 10,
                'curCoolDown': 0,
                'description': 'Increase attack speed by 200% for 3 seconds',
                'iconPath': '/public/images/skills/SKILL_Shoot.png',
                'function': function (game, self, params) {
                    let duration = 3;
                    let effect = function (game, self) {
                        self.tempBuff.attackSpeed += (self.baseStatus.attackSpeed + self.buff.attackSpeed) * 2;
                    };
                    game.onGoingSkills[self.name + 3] = new onGoingSkill(duration, effect, self, true);
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
            'damage': 5,
            'defense': 0,
            'speed': 15,
            'attackInterval': 60,
            'attackSpeed': 1,
        };
        this.skill_model = '';
        this.singing = false;
        this.chanting = false;

        this.skills = {
            0: {
                'name': 'Shoot',
                'sound': 'shoot',
                'type': SKILL_TYPE.SHOOT,
                'coolDown': 0,
                'curCoolDown': 0,
                'description': 'Shoot an arrow',
                'iconPath': '/public/images/skills/SKILL_Shoot.png',
                'function': function (game, self, params) {
                    if (self.attackTimer > 0) {
                        return false;
                    }
                    const name = self.name;
                    const cursor = params.position;
                    const direction = glMatrix.vec3.create();
                    glMatrix.vec3.subtract(direction, cursor, self.position);
                    direction[1] = 0;
                    glMatrix.vec3.normalize(direction, direction);
                    self.direction = direction;
                    game.shoot(name, 50, self.status.damage, 0.2);
                },
            },

            1: {
                'name': 'Sing',
                'sound': 'heal',
                'coolDown': 10,
                'curCoolDown': 0,
                'description': 'The wizard starts singing. Because his voice is too beatiful,' +
                    'whoever hears it can heal 5 health per seconds',
                'iconPath': '/public/images/skills/SKILL_Heal.png',
                'strength': 10,
                'type': SKILL_TYPE.ONGOING,
                'function': function (game, self, params) {
                    if (self.chanting) {
                        return false;
                    }
                    self.singing = true;
                    self.skills[2].curCoolDown = self.skills[2].coolDown;
                    const duration = 10;
                    const radius = 20;
                    const effect = function (game, self) {
                        const position = self.position;
                        game.objects[self.skill_model].position = position;
                        game.objects[self.skill_model].position[1] += 0.5;
                        const objsInRadius = game.getObjInRadius(position, radius);
                        objsInRadius.forEach(function (obj) {
                            if (obj.type === "player" && !obj.dead) {
                                obj.status.curHealth = Math.min(obj.status.curHealth + 10 / server.tick_rate, obj.status.maxHealth)
                                obj.KEYS.push("status");
                                game.toSend.push(obj.name);
                            }
                        })
                    };

                    const endEffect = function (game, self) {
                        self.singing = false;
                        if (typeof self.skill_model !== 'undefined' && typeof game.objects[self.skill_model] !== 'undefined') {
                            game.toClean.push(self.skill_model);
                            self.skill_model = '';
                        }
                    }
                    game.onGoingSkills[self.name + 0] = new onGoingSkill(duration, effect, self, false, endEffect);

                    // ring model
                    const ring = new Ring(self.position, radius, self.name, 'ring_green');
                    self.skill_model = ring.name;
                    game.toSend.push(ring.name);
                    game.objects[ring.name] = ring;
                },
            },

            2: {
                'name': 'Chant',
                'sound': 'buff',
                'coolDown': 10,
                'curCoolDown': 0,
                'description': 'The wizard starts chanting. The chanting strenghthens whoever hears it',
                'strength': 10,
                'type': SKILL_TYPE.ONGOING,
                'iconPath': '/public/images/skills/SKILL_Medicine.png',
                'function': function (game, self, params) {
                    if (self.singing) {
                        return false;
                    }
                    self.chanting = true;
                    self.skills[1].curCoolDown = self.skills[2].coolDown;
                    const duration = 10;
                    const radius = 20;
                    const buffedUnit = {};
                    const effect = function (game, self) {
                        const position = self.position;
                        game.objects[self.skill_model].position = position;
                        game.objects[self.skill_model].position[1] += 0.5;
                        const objsInRadius = game.getObjInRadius(position, radius);

                        // use this to remember who has been buffed before
                        for (let key in buffedUnit) {
                            buffedUnit[key] = false;
                        }

                        objsInRadius.forEach(function (obj) {
                            if (obj.type === "player" && !obj.dead) {
                                obj.tempBuff.damage += 10;
                                obj.KEYS.push("status");
                                obj.KEYS.push("tempBuff");
                                game.toSend.push(obj.name);
                                buffedUnit[obj.name] = true;
                            }
                        })

                        // reset whose who has been buffed before but no longer being buffed
                        for (let key in buffedUnit) {
                            if (!buffedUnit[key]) {
                                delete buffedUnit[key];
                                game.toSend.push(key);
                                game.objects[key].KEYS.push("status");
                                game.objects[key].KEYS.push("tempBuff");
                            }
                        }
                    };
                    const endEffect = function (game, self) {
                        self.chanting = false;
                        if (typeof self.skill_model !== 'undefined' && typeof game.objects[self.skill_model] !== 'undefined') {
                            game.toClean.push(self.skill_model);
                            self.skill_model = '';
                        }
                        for (let key in buffedUnit) {
                            delete buffedUnit[key];
                            game.toSend.push(key);
                            game.objects[key].KEYS.push("status");
                            game.objects[key].KEYS.push("tempBuff");
                        }
                    }
                    game.onGoingSkills[self.name + 1] = new onGoingSkill(duration, effect, self, false, endEffect);

                    // ring model
                    const ring = new Ring(self.position, radius, self.name, 'ring_red');
                    self.skill_model = ring.name;
                    game.toSend.push(ring.name);
                    game.objects[ring.name] = ring;
                },
            },

            3: {
                'name': 'Resurrect',
                'sound': 'resurrect',
                'coolDown': 30,
                'curCoolDown': 0,
                'description': 'Resurrect a dead player',
                'iconPath': '/public/images/skills/SKILL_Surgery.png',
                'type': SKILL_TYPE.LOCATION,
                'function': function (game, self, params) {
                    const name = self.name;
                    const location = params.position;
                    // skill location too far from invoker
                    if (Utils.calculateDistance(self.position, location) > 5) {
                        return false;
                    }
                    const radius = 5;
                    const objsInRadius = game.getObjInRadius(location, radius);
                    let revived = false;

                    objsInRadius.forEach(function (obj) {
                        if (obj.type === "player" && obj.status.curHealth <= 0) {
                            obj.status.curHealth = obj.status.maxHealth;
                            obj.KEYS.push("status");
                            game.toSend.push(obj.name);
                            game.survivorHasRevived(obj.name);
                            revived = true;
                        }
                    })
                    return revived;
                }
            },
        };

    }
}

function initializeProfession(survivor, msg) {
    let profession = null;
    switch (msg) {
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
    delete baseStatus.curHealth;
    survivor.baseStatus = baseStatus;
    survivor.iconPath = profession.iconPath;
    for (i in survivor.skills) {
        survivor.skills[i].KEYS = ['coolDown', 'curCoolDown', 'curCharge', 'maxCharge'];
    }
}

module.exports.initializeProfession = initializeProfession;
module.exports.SKILL_TYPE = SKILL_TYPE;
module.exports.Survivor = Survivor;
module.exports.God = God;