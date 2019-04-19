/** Helper class */
survivorCount = 0;
class Survivor {
    constructor(socketid) {
        this.id = ++survivorCount;
        this.name = 'Survivor ' + this.id;
        this.socketid = socketid;
        this.position = {x:0, y:0, z:0}; // starting location
        this.health = 100; // set to a default value
    }
} 

class God { 
    constructor(socketid) {
        this.name = 'God';
        this.id = socketid;
        this.position = {x:0, y:0, z:0};
    }
}

class Item {
    constructor() {
        this.name = 'Item';
        this.position = {x:0, y:0, z:0};
    }
}

class Tile {
    constructor() {
        this.type = '';
        this.content = [];
    }
}


class GameInstance {
    constructor() {
        this.worldWidth = 5;
        this.worldHeight = 5;
        this.clientSockets = [];
        this.socketidToPlayer = {};
        this.survivors = [];
        this.objectList = []; //store all objects (players, trees, etc) on the map
        this.nameToObj = {};
    }

    insertObjListAndMap(obj) {
        this.nameToObj[obj.name] = obj; // store reference
        this.objectList.push(obj);
        this.map[obj.position.z][obj.position.x].content.push(obj);
    };

    initializeMap() {
        this.map = new Array(this.worldHeight);
        for (let i = 0; i < this.map.length; i++) {
            this.map[i] = new Array(this.worldWidth).fill(new Tile());
        }
        // store object info on the map
        this.objectList.forEach(function(obj){
            if (typeof obj.position === 'undefined') {
                console.log("Position not initialized: " + obj.name);
            }
            else {
                this.map[obj.position.z][obj.position.x].content.push(obj);
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
        if (this.survivors.length < 3) {
            let survivor = new Survivor(socketid)
            this.survivors.push(survivor);
            this.clientSockets.push(socketid);
            this.socketidToPlayer[socketid] = survivor;
            this.insertObjListAndMap(survivor);
            return true;
        }
        return false;
    }

    checkEnoughPlayer() {
        if (typeof this.god === 'undefined' || this.survivors.length < 3) 
            return false;
        return true;
    }

    numPlayersStatusToString() {
        return this.survivors.length + '/3 survivor' 
            + (this.survivors.length < 2 ? '':'s') + ' and ' 
            + (typeof this.god === 'undefined'? '0':'1') + '/1 god';
    }
}

module.exports = GameInstance;