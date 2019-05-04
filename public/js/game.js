const glMatrix = require('gl-Matrix');

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
        this.skills = {
            0: {
                'name': 'SKILL_1',
                'coolDown': 10,
                'curCoolDown': 0,
                'function': function () {
                    // TODO
                },
            }
        }
        this.status = {
            'STATUS_health': 100,
            'STATUS_curHealth': 100,
            'STATUS_attackPoint': 10,
            'STATUS_defense': 10,
            'STATUS_speed': 10,
        }
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
        this.skills = {
            0: {
                'name': 'Slime',
                'coolDown': 1,
                'curCoolDown': 0,
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
                    game.physicsEngine.addSlime(slime.name, slime.mass, { x: position[0], y: position[1], z: position[2] }, 0)
                },
            }
        }
        this.status = {
            'STATUS_health': 100,
            'STATUS_curHealth': 100,
            'STATUS_attackPoint': 10,
            'STATUS_defense': 10,
            'STATUS_speed': 20,
        }
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
        this.model = 'slime';
        this.status = {
            'STATUS_health': 100,
            'STATUS_curHealth': 100,
            'STATUS_attackPoint': 10,
            'STATUS_defense': 0,
            'STATUS_speed': 5,
        }
    }
}

class Tile {
    constructor() {
        this.type = '';
        this.content = [];
    }
}


class GameInstance {
    constructor(max_survivors = 3, physicsEngine) {
        this.max_survivors = max_survivors;
        this.survivorCount = 0;
        this.slimeCount = 0;
        this.worldHalfWidth = 500;
        this.worldHalfHeight = 500;
        this.clientSockets = [];
        this.socketidToPlayer = {};
        this.survivors = [];
        this.objects = {};                    // store all objects (players, trees, etc) on the map
        this.initializeMap();                 // build this.map
        // testing
        const slime = new Slime(this.slimeCount);
        this.slimeCount++;
        this.insertObjListAndMap(slime);
        this.physicsEngine = physicsEngine;
        this.physicsEngine.addSlime(slime.name, slime.mass, { x: -20, y: 10, z: 0 }, 0)
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
        for (let obj in this.objects) {
            if (typeof this.objects[obj].skills !== 'undefined') {
                let skills = this.objects[obj].skills;
                for (let skill in skills) {
                    if (skills[skill].curCoolDown > 0) {
                        skills[skill].curCoolDown -= amount;
                    } else if (skills[skill].curCoolDown <= 0) {
                        skills[skill].curCoolDown = 0;
                    }
                }
            }
        }
    }

    joinAsGod(socketid) {
        if (typeof this.god === 'undefined') {
            this.god = new God(socketid);
            this.clientSockets.push(socketid);
            this.socketidToPlayer[socketid] = this.god;
            this.insertObjListAndMap(this.god);
            this.physicsEngine.addPlayer(this.god.name, this.god.mass, { x: 0, y: 10, z: 0 }, this.god.maxJump);

            return true;
        }
        return false;
    };

    joinAsSurvivor(socketid) {
        if (this.survivors.length < this.max_survivors) {
            const survivor = new Survivor(socketid, this.survivorCount);
            this.survivorCount++;
            this.survivors.push(survivor);
            this.clientSockets.push(socketid);
            this.socketidToPlayer[socketid] = survivor;
            this.insertObjListAndMap(survivor);
            this.physicsEngine.addPlayer(survivor.name, survivor.mass, { x: -10, y: 20, z: 1 }, survivor.maxJump);
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
    }

    jump(name) {
        this.physicsEngine.jump(name, this.objects[name].jumpSpeed, this.objects[name].maxJump);
    }

    stay(name) {
        this.physicsEngine.stopMovement(name);
    }

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
}

module.exports = GameInstance;