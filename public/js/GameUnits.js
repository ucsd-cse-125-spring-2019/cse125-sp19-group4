const Utils = require("./utils.js");
const glMatrix = require('gl-Matrix');

class Item {
    constructor(name, kind) {
        this.name = name;
        this.kind = kind;
        this.model = kind;
        this.position = [0, 0, 0];
        this.direction = [0, 0, 1];
    }
}

class Slime {
    constructor(sid, attackMode) {
        this.name = "Slime " + sid;
        this.position = [0, 0, 0];
        this.direction = [0, 0, 1]; // facing (x, y, z)
        this.mass = 100;
        this.movementSpeed = 8;
        this.model = "slime";
        this.radius = 2;
        this.status = {
            STATUS_maxHealth: 30,
            STATUS_curHealth: 30,
            STATUS_damage: 10,
            STATUS_defense: 0,
            STATUS_speed: 5
        };
        this.attacking = {};
        this.attackMode = attackMode;
        this.attackInterval = 60;
        this.attackTimer = this.attackInterval;
        if (attackMode === "explode") this.minDistanceFromPlayer = 0;
        else if (attackMode === "shoot") {
            this.minDistanceFromPlayer = 10;
            this.shootingSpeed = 20;
        } else if (attackMode === "melee") this.minDistanceFromPlayer = 5; // This should be adjusted to the size of bounding box of slime
        
        this.KEYS = ["model", "position", "direction", "status"];
        Utils.recursiveSetPropertiesFilter(this);
    }
    
    onHit(game, damage) {
        this.status.STATUS_curHealth -= damage;
        this.KEYS.push("status");
        game.toSend.push(this.name);
    }
    
    /**
    * Find the closest survivor and set it to be the attackee of object given by name
    */
    chase(game) {
        const slime = this;
        let closestSurvivor;
        let minDistance = Number.MAX_VALUE;
        game.survivors.forEach(function(s) {
            const distance = glMatrix.vec3.distance(slime.position, s.position);
            if (distance < minDistance) {
                minDistance = distance;
                closestSurvivor = s;
            }
        });
        
        const direction = glMatrix.vec3.create();
        glMatrix.vec3.subtract(direction, closestSurvivor.position, this.position);
        direction[1] = 0;
        glMatrix.vec3.normalize(direction, direction);
        //TODO: Assume slime only stays on plane ground
        if (minDistance < slime.minDistanceFromPlayer)
        game.move(this.name, direction, true);
        else game.move(this.name, direction, false);
        
        this.attacking = closestSurvivor;
    }
}

class Tile {
    constructor() {
        this.type = "";
        this.content = [];
    }
}

class Bullet {
    constructor(position, direction, bulletId) {
        this.name = "Bullet " + bulletId;
        this.radius = 0.2;
        this.position = position;
        this.direction = direction;
        this.model = "bullet";
    }
}

class Tree {
    constructor(treeId, size) {
        this.name = 'Tree ' + treeId;
        this.radius = 0;    // only to suppress error when assigning position from physics engine
        this.position = [20, 0, -20];
        this.direction = [0, 0, -1];
        this.model = 'tree';
        this.size = size;
    }
}

module.exports.Units = { Item, Slime, Tile, Bullet, Tree };