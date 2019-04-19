class GameInstance {
    constructor() {
        this.worldWidth = 5;
        this.worldHeight = 5;
        this.clientSockets = [];
        this.survivors = [];
        this.objectList = []; //store all objects (players, trees, etc) on the map
        this.nameToObj = {};
    }
}

let gameInstance = module.exports = new GameInstance();

gameInstance.insertObjListAndMap = function(obj) {
    this.nameToObj[obj.name] = obj; // store reference
    this.objectList.push(obj);
    this.map[obj.position.z][obj.position.x].content.push(obj);
};

gameInstance.initializeMap = function() {
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

gameInstance.joinAsGod = function(socketid) {
    if (typeof this.god === 'undefined') {
        this.god = new God(socketid);
        this.clientSockets.push(socketid);
        this.insertObjListAndMap(this.god);
        return true;
    }
    return false;
};

gameInstance.joinAsSurvivor = function(socketid) {
    if (this.survivors.length < 3) {
        let survivor = new Survivor(socketid)
        this.survivors.push(survivor);
        this.clientSockets.push(socketid);
        this.insertObjListAndMap(survivor);
        return true;
    }
    return false;
}

gameInstance.checkEnoughPlayer = function() {
    if (typeof this.god === 'undefined' || this.survivors.length < 3) 
        return false;
    return true;
}

gameInstance.numPlayersStatusToString = function() {
    return this.survivors.length + '/3 survivor' 
        + (this.survivors.length < 2 ? '':'s') + ' and ' 
        + (typeof this.god === 'undefined'? '0':'1') + '/1 god';
}

/** Helper class */
survivorCount = 0;
class Survivor {
    constructor(socketid) {
        this.id = ++survivorCount;
        this.name = 'Survivor' + this.id;
        this.socketid = socketid;
        this.position = {x:0, y:0, z:0}; // starting location
        this.health = 100; // set to a default value
    }
} 

class God { 
    constructor(socketid) {
        this.name = 'God';
        this.id = socketid;
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

/*================= Game Initialization ======================*/
gameInstance.initializeMap();