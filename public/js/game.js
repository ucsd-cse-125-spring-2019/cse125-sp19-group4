const glMatrix = require('gl-Matrix');

/** Helper class */
class Survivor {
    constructor(socketid, sid) {
        this.name = 'Survivor ' + sid;
        this.socketid = socketid;
        this.position = [0, 0, 0]; // location (x, y, z)
        this.direction = [0, 0, -1]; // facing (x, y, z)
        this.movementSpeed = 10;
        this.mass = 500;
        this.maxJump = 2;
        this.jumpSpeed = 8;
        this.health = 100; // set to a default value
        this.model = 'player';
        this.skills = {
            '1': {
                'coolDown': 10,
                'curCoolDown': 0,
            }
        }
    }
}

class God {
    constructor(socketid) {
        this.name = 'God';
        this.socketid = socketid;
        this.position = [0, 0, 0];
        this.direction = [0, 0, -1]; // facing (x, y, z)
        this.movementSpeed = 20;
        this.mass = 500;
        this.maxJump = 10;
        this.jumpSpeed = 10;
        this.model = 'player';
        this.skills = {
            '1': {
                'coolDown': 10,
                'curCoolDown': 0,
            }
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
    constructor() {
        this.name = 'Slime';
        this.position = [0, 0, 0];
        this.direction = [0, 0, 1]; // facing (x, y, z)
        this.mass = 100;
        this.movementSpeed = 8;
        this.health = 100; // set to a default value
        this.model = 'slime';
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
        this.worldWidth = 5;
        this.worldHeight = 5;
        this.clientSockets = [];
        this.socketidToPlayer = {};
        this.survivors = [];
        this.objects = {};                    // store all objects (players, trees, etc) on the map
        this.initializeMap();                 // build this.map
        // testing
        let slime = new Slime();
        this.insertObjListAndMap(slime);
        this.physicsEngine = physicsEngine;
        this.physicsEngine.addSlime(slime.name, slime.mass, {x: -20, y: 10, z: 0}, 0)
    }

    insertObjListAndMap(obj) {
        if (obj.name in this.objects) {
            throw obj.name + " already in objects";
        }
        this.objects[obj.name] = obj; // store reference
        this.map[obj.position[2]][obj.position[0]].content.push(obj);
    };

    initializeMap() {
        this.map = new Array(this.worldHeight);
        for (let i = 0; i < this.map.length; i++) {
            this.map[i] = new Array(this.worldWidth);
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
            if (this.objects[obj].skills != undefined) {
                let skills = this.objects[obj].skills;
                for (let skill in skills) {
                    if (skills[skill].curCoolDown > 0) {
                        skills[skill].curCoolDown -= amount;
                    } else if (skills[skill].curCoolDown <= 0) { //for debug purpose
                        skills[skill].curCoolDown = skills[skill].coolDown;
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
            this.physicsEngine.addPlayer(this.god.name, this.god.mass, { x: 10, y: 10, z: 10 }, this.god.maxJump);
            
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
        const speed = obj.movementSpeed;
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
        let {skillName} = skillParams;
        if (obj.skills[skillName].curCoolDown > 0) { // not cooled down
            return;
        }
        obj.skills[skillName].curCoolDown = obj.skills[skillName].coolDown;
        // dosomething
    }
}

module.exports = GameInstance;