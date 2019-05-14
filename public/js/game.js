const glMatrix = require('gl-Matrix');
const Utils = require('./utils.js')
const gameProfession = require('./GameProfession')

/** Helper class */
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
        this.KEYS = ['position', 'direction', 'skills', 'status'] // contain a list of property that we want to send to client
        this.profession = null;
        this.skills = {};
        this.status = {};
    }

    onHit(damage) {
        this.status.STATUS_curHealth -= damage;
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
                'function': function (game, params) {
                    const position = params.position;
                    if (Math.abs(Math.floor(position[0])) > game.worldHalfWidth || Math.abs(Math.floor(position[2])) > game.worldHalfHeight) {
                        console.log('Slime() out of the world');
                        return;
                    }
                    const slime = new Slime(game.slimeCount);
                    slime.position = position;
                    slime.position[1] += 2;
                    game.slimeCount++;
                    game.insertObjListAndMap(slime);
                    game.slimes.push(slime.name);
                    game.physicsEngine.addSlime(slime.name, slime.mass, slime.radius,
                        { x: position[0], y: position[1], z: position[2] }, slime.status.STATUS_speed);
                },
            },
        };
        this.status = {
            'STATUS_maxHealth': 100,
            'STATUS_curHealth': 100,
            'STATUS_damage': 10,
            'STATUS_defense': 10,
            'STATUS_speed': 20,
        }

        this.KEYS = ['position', 'direction', 'skills', 'status'] // contain a list of property that we want to send to client
    }

    onHit(damage) {
        this.status.STATUS_curHealth -= damage;
    }
}

class Item {
    constructor() {
        this.name = 'Item';
        this.position = [0, 0, 0];
    }
}

class Slime {
    constructor(sid) {
        this.name = 'Slime ' + sid;
        this.position = [0, 0, 0];
        this.direction = [0, 0, 1]; // facing (x, y, z)
        this.mass = 100;
        this.movementSpeed = 8;
        this.model = 'slime';
        this.radius = 2;
        this.status = {
            'STATUS_maxHealth': 30,
            'STATUS_curHealth': 30,
            'STATUS_damage': 10,
            'STATUS_defense': 0,
            'STATUS_speed': 5,
        };
        this.attacking = null;
    }

    onHit(damage) {
        this.status.STATUS_curHealth -= damage;
    }

    /**
     * Find the closest survivor and set it to be the attackee of object given by name
     */
    chase(game) {
        const slime = this;
        let closestSurvivor;
        let minDistance = Number.MAX_VALUE;
        game.survivors.forEach(function (s) {
            const distance = glMatrix.vec3.distance(slime.position, s.position);
            if (distance < minDistance) {
                minDistance = distance;
                closestSurvivor = s;
            }
        });
        const direction = glMatrix.vec3.create();
        glMatrix.vec3.subtract(direction, closestSurvivor.position, this.position);
        glMatrix.vec3.normalize(direction, direction);
        //TODO: Assume slime only stays on plane ground
        game.move(this.name, direction);
        this.attacking = closestSurvivor;
    }

}

class Tile {
    constructor() {
        this.type = '';
        this.content = [];
    }
}

class Bullet {
    constructor(position, direction, bulletId) {
        this.name = 'Bullet ' + bulletId;
        this.position = position;
        this.direction = direction;
        this.model = 'bullet';
    }
}

class Tree {
    constructor(treeId) {
        this.name = 'Tree ' + treeId;
        this.position = [20, 0, -20];
        this.direction = [0, 0, -1];
        this.model = 'tree';
    }
}

class GameInstance {
    constructor(max_survivors = 3, physicsEngine) {
        this.max_survivors = max_survivors;
        this.survivorCount = 0;
        this.slimeCount = 0;
        this.treeId = 0;
        this.worldHalfWidth = 500;
        this.worldHalfHeight = 500;
        this.clientSockets = [];
        this.socketidToPlayer = {};
        this.survivors = [];
        this.objects = {};                    // store all objects (players, slimes, trees, etc) on the map
        this.slimes = [];
        this.initializeMap();                 // build this.map
        this.physicsEngine = physicsEngine;
        this.bulletId = 0;
        this.meleeId = 0;
        this.interactId = 0;
        this.toClean = [];
        this.skillables = {};
        this.playerCount = {
            'GodCount': 0,
            'FighterCount': 0,
            'ArcherCount': 0,
            'HealerCount': 0,
            'BuilderCount': 0
        }

        // testing
        // const slime = new Slime(this.slimeCount);
        // this.slimeCount++;
        // this.insertObjListAndMap(slime);
        // this.physicsEngine.addSlime(slime.name, slime.mass, slime.radius, {x: -20, y: 10, z: 0}, slime.status.STATUS_speed);
        const tree = new Tree(this.treeId++);
        this.insertObjListAndMap(tree);
        this.physicsEngine.addTree(tree.name);
    }

    insertObjListAndMap(obj) {
        if (obj.name in this.objects) {
            throw obj.name + " already in objects";
        }
        this.objects[obj.name] = obj; // store reference
        this.map[Math.floor(obj.position[2]) + this.worldHalfHeight][Math.floor(obj.position[0]) + this.worldHalfWidth].content.push(obj);
    };

    initializeMap() {
        this.map = new Array(2 * this.worldHalfHeight);
        for (let i = 0; i < this.map.length; i++) {
            this.map[i] = new Array(2 * this.worldHalfWidth);
            for (let j = 0; j < this.map[i].length; j++) {
                this.map[i][j] = new Tile();
            }
        }
        // store object info on the map
        Object.keys(this.objects).forEach(function (key) {
            const obj = this.objects[key];
            if (typeof obj.position === 'undefined') {
                console.log("Position not initialized: " + key);
            }
            else {
                this.map[obj.position[2]][obj.position[0]].content.push(obj);
            }
        });
    }

    decrementCoolDown(amount) {
        for (let obj in this.skillables) {
            let skills = this.skillables[obj].skills;
            for (let skill in skills) {
                if (skills[skill].curCoolDown > 0) {
                    skills[skill].curCoolDown -= amount;
                    this.skillables[obj].KEYS.push("skills");
                } else if (skills[skill].curCoolDown < 0) {
                    skills[skill].curCoolDown = 0;
                    this.skillables[obj].KEYS.push("skills");
                }
            }
        }
    }

    joinAsGod(socketid) {
        if (typeof this.god === 'undefined') {
            this.playerCount.GodCount += 1;
            this.god = new God(socketid);
            this.clientSockets.push(socketid);
            this.socketidToPlayer[socketid] = this.god;
            this.insertObjListAndMap(this.god);
            this.physicsEngine.addPlayer(this.god.name, this.god.mass, this.god.radius, { x: 0, y: 10, z: 0 }, this.god.maxJump, true);
            this.skillables[this.god.name] = this.god
            return true;
        }
        return false;
    };

    joinAsSurvivor(socketid, msg) {
        if (this.survivors.length < this.max_survivors) {
            this.playerCount[msg + "Count"] += 1;
            const survivor = new Survivor(socketid, this.survivorCount);
            gameProfession.initializeProfession(survivor, msg);
            this.survivorCount++;
            this.survivors.push(survivor);
            this.clientSockets.push(socketid);
            this.socketidToPlayer[socketid] = survivor;
            this.insertObjListAndMap(survivor);
            this.physicsEngine.addPlayer(survivor.name, survivor.mass, survivor.radius, { x: -10, y: 20, z: 1 }, survivor.maxJump, false);
            this.skillables[survivor.name] = survivor;
            return true;
        }
        return false;
    }

    checkEnoughPlayer() {
        if (typeof this.god === 'undefined' || this.survivors.length < this.max_survivors) {
            return false;
        }
        return true;
    }

    numPlayersStatusToString() {
        return this.survivors.length + '/' + this.max_survivors + ' survivor'
            + (this.survivors.length < 2 ? '' : 's') + ' and '
            + (typeof this.god === 'undefined' ? '0' : '1') + '/1 god';
    }

    move(name, direction) {
        const obj = this.objects[name];
        const speed = obj.status.STATUS_speed;
        this.physicsEngine.updateVelocity(name, direction, speed);
        obj.direction = direction;
        if ('KEYS' in obj) {
            obj.KEYS.push('direction');
        }
    }

    jump(name) {
        this.physicsEngine.jump(name, this.objects[name].jumpSpeed, this.objects[name].maxJump);
    }

    stay(name) {
        this.physicsEngine.stopMovement(name);
    }

    // ==================================== Attack System ===================================
    handleSkill(name, skillParams) {
        const obj = this.objects[name];
        let { skillNum } = skillParams;
        let skill = Object.values(obj.skills)[skillNum]
        if (skill.curCoolDown > 0) { // not cooled down
            return;
        }
        skill.curCoolDown = skill.coolDown;
        skill.function(this, skillParams);
    }

    /**
     * TODO: Add more attack forms besides bullet
     * Create a bullet for the attacker
     * @param {string} name the name of object that initiates the attack
     */
    shoot(name) {
        const player = this.objects[name];
        const bullet = new Bullet(player.position, player.direction, this.bulletId++);
        this.objects[bullet.name] = bullet; // Bullet + id, e.g. Bullet 0
        this.physicsEngine.shoot(name, player.direction, 20, bullet.name);
    }

    melee(name) {
        const player = this.objects[name];
        const meleeId = "Melee " + (this.meleeId++);
        this.physicsEngine.melee(name, player.direction, meleeId);
    }

    // ==================================== Before Step ===================================
    beforeStep() {
        this.slimesChase();
    }

    /**
     * Called before each step to update slimes direction
     */
    slimesChase() {
        const game = this;
        if (this.survivors.length > 0) {
            this.slimes.forEach(function (name) {
                game.objects[name].chase(game);
            });
        }
    }

    // ==================================== After Step ===================================
    afterStep() {
        this.handleSlimeExplosion();
        this.handleDamage();
        this.cleanup();
    }

    /**
     * Run through 'hits' to handle all the damage in current step 
     */
    handleDamage() {
        const gameInstance = this;
        this.physicsEngine.hits.forEach(function (hit_name) {
            const hit = gameInstance.physicsEngine.obj[hit_name];
            const attacker = gameInstance.objects[hit.from];
            const attackee = gameInstance.objects[hit.to];

            // the melee/bullet hit enemy
            if (typeof attackee !== 'undefined') {
                attackee.onHit(attacker.status.STATUS_damage);
                console.log(attackee.name, 'lost', attacker.status.STATUS_damage, 'health. Current Health:', attackee.status.STATUS_curHealth, '/', attackee.status.STATUS_maxHealth);

                if (attackee.status.STATUS_curHealth <= 0) {
                    gameInstance.toClean.push(attackee.name);
                    const index = gameInstance.slimes.indexOf(attackee.name);
                    if (index > -1) {
                        gameInstance.slimes.splice(index, 1);
                    }
                    console.log(attackee.name, 'died');
                }
            }
            gameInstance.toClean.push(hit_name);
        });
    }

    /**
     * Handle slime explosion damage when slime hits player
     */
    handleSlimeExplosion() {
        const gameInstance = this;
        this.physicsEngine.slimeExplosion.forEach(function (e) {
            const attackee = gameInstance.objects[e.attacking];
            const slime = gameInstance.objects[e.name];
            attackee.onHit(slime.status.STATUS_damage);
            const index = gameInstance.slimes.indexOf(e.name);
            if (index > -1) {
                gameInstance.slimes.splice(index, 1);
            }
            gameInstance.toClean.push(slime.name);
            console.log(attackee.name, 'lost', slime.status.STATUS_damage, 'health. Current Health:', attackee.status.STATUS_curHealth, '/', attackee.status.STATUS_maxHealth);

            if (attackee.status.STATUS_curHealth <= 0) {
                gameInstance.toClean.push(attackee.name);
                console.log(attackee.name, 'died');
            }
        })
    }

    /**
     * Clean up all the instances that are to be removed from the world
     * e.g. dead monster, bullets
     */
    cleanup() {
        const gameInstance = this;
        this.toClean.forEach(function (name) {
            if (typeof gameInstance.objects[name] !== 'undefined') {
                delete gameInstance.objects[name];
            }
        });
        this.physicsEngine.cleanup(this.toClean);
        this.toClean.length = 0;
        // this.meleeId = 0; // Each melee would only last 1 step
    }

    // After status was sent the first time(everything in the status was sent), filter
    // out some properties that are not needed
    setToJSONFunctions() {
        for (let key in this.objects) {
            Utils.recursiveSetPropertiesFilter(this.objects[key]);
        }
    }

    // at the begining of each loop, set all omitable properties to not be sent,
    // if those properties are modified during this cycle, add them back to send them.
    clearKeys() {
        const omitables = {
            "direction": null,
            "status": null
        }
        for (let obj in this.skillables) {
            this.skillables[obj].KEYS = this.skillables[obj].KEYS.filter(item => item !== "skills")
        }
        for (let obj in this.objects) {
            if ('KEYS' in this.objects[obj]) {
                this.objects[obj].KEYS = this.objects[obj].KEYS.filter(item => !(item in omitables))
            }
        }
    }
}

module.exports = GameInstance;