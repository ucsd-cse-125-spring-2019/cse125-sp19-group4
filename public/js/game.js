class GameInstance {
    constructor() {
        this.clientSockets = [];
        this.survivors = [];
        this.items = [];
    }
}

let gameInstance = module.exports = new GameInstance();

gameInstance.joinAsGod = function(socketid) {
    if (typeof this.god === 'undefined') {
        this.god = new God(socketid);
        this.clientSockets.push(socketid);
        return true;
    }
    return false;
};

gameInstance.joinAsSurvivor = function(socketid) {
    if (this.survivors.length < 3) {
        this.survivors.push(new Survivor(socketid));
        this.clientSockets.push(socketid);
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
class Survivor {
    constructor(socketid) {
        this.id = socketid;
        this.position = {x:0, y:0, z:0}; // starting location
        this.health = 100; // set to a default value
    }
} 

class God { 
    constructor(socketid) {
        this.id = socketid;
    }
}

class Items {
    constructor(position) {
        this.position = position
    }
}