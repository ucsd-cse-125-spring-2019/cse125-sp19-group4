const glMatrix = require('gl-Matrix');

/** Helper class */
class Survivor {
    constructor(socketid, sid) {
        this.name = 'Survivor ' + sid;
        this.socketid = socketid;
        this.position = [0, 0, 0]; // location (x, y, z)
        this.direction = [0, 0, -1]; // facing (x, y, z)
        this.movementSpeed = 5;
        this.health = 100; // set to a default value
    }
}

class God {
    constructor(socketid) {
        this.name = 'God';
        this.socketid = socketid;
        this.position = [0, 0, 0];
        this.movementSpeed = 10;
        this.direction = [0, 0, -1]; // facing (x, y, z)
    }
}

class Item {
    constructor() {
        this.name = 'Item';
        this.position = [0, 0, 0];
    }
}

class Tile {
    constructor() {
        this.type = '';
        this.content = [];
    }
}


class GameInstance {
    constructor(max_survivors = 3) {
        this.max_survivors = max_survivors;
        this.survivorCount = 0;
        this.worldWidth = 5;
        this.worldHeight = 5;
        this.clientSockets = [];
        this.socketidToPlayer = {};
        this.survivors = [];
        this.objects = {};                    // store all objects (players, trees, etc) on the map
        this.initializeMap();                        // build this.map
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
            this.map[i] = new Array(this.worldWidth).fill(new Tile());
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

    joinAsGod(socketid) {
        if (typeof this.god === 'undefined') {
            this.god = new God(socketid);
            this.clientSockets.push(socketid);
            this.socketidToPlayer[socketid] = this.god;
            this.insertObjListAndMap(this.god);
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

    move(name, direction, deltaTime) {
        const obj = this.objects[name];
        const velocity = obj.movementSpeed * deltaTime * 0.001;
        // glMatrix.vec3.normalize(direction, direction);
        let temp = glMatrix.vec3.create();
        glMatrix.vec3.scale(temp, direction, velocity);
        glMatrix.vec3.add(obj.position, obj.position, temp);
        obj.direction = direction;
    }
}

module.exports = GameInstance;