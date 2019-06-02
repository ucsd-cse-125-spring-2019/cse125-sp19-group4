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
        this.type = "slime";
        this.radius = 2;
        this.status = {
            maxHealth: 30,
            curHealth: 30,
            damage: 10,
            defense: 0,
            speed: 5,
            attackInterval: 60,
        };
        this.attacking = {};
        this.attackMode = attackMode;
        this.attackTimer = this.status.attackInterval;
        this.progressPoint = 5;
        if (attackMode === "explode") {
            this.status.damage = 40;
            this.minDistanceFromPlayer = 0;
        }
        else if (attackMode === "shoot") {
            this.model = 'cactus';
            this.minDistanceFromPlayer = 10;
            this.shootingSpeed = 20;
        } else if (attackMode === "melee") {
            this.status.damage = 20;
            this.minDistanceFromPlayer = 5; // This should be adjusted to the size of bounding box of slime
        }

        this.KEYS = ["model", "position", "direction", "status"];
        Utils.recursiveSetPropertiesFilter(this);
    }

    onHit(game, damage) {
        this.status.curHealth -= damage;
        this.KEYS.push("status");
        game.toSend.push(this.name);
    }

    /**
    * Find the closest survivor and set it to be the attackee of object given by name
    */
    chase(game, name = null) {
        // chasing the warrior
        if (name != null) {
            const obj = game.objects[name]
            const direction = glMatrix.vec3.create();
            glMatrix.vec3.subtract(direction, obj.position, this.position);
            direction[1] = 0;
            glMatrix.vec3.normalize(direction, direction);
            game.move(this.name, direction, false);
            return;
        }

        const slime = this;
        let closestSurvivor;
        let minDistance = Number.MAX_VALUE;
        game.liveSurvivors.forEach(function (s) {
            const survivor = game.objects[s]
            // const distance = glMatrix.vec3.distance(slime.position, survivor.position);
            // const distance = glMatrix.vec3.length(survivor.position); // distance to center
            let distance = Math.min(glMatrix.vec3.distance(slime.position, survivor.position),
                glMatrix.vec3.length(survivor.position));
            if (distance < minDistance) {
                minDistance = distance;
                closestSurvivor = survivor;
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
    constructor(position, direction, radius, bulletId) {
        this.name = "Bullet " + bulletId;
        this.radius = radius;
        this.size = radius / 0.2;
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
        this.type = "tree"
    }
}

class Tower {
    constructor(maxHealth) {
        this.name = 'Tower';
        this.radius = 1;
        this.position = [0, 0, 0];
        this.direction = [0, 0, 1];
        this.model = 'tower';
        this.maxHealth = maxHealth;
        this.curHealth = this.maxHealth;
    }

module.exports.Units = { Item, Slime, Tile, Bullet, Tree, Tower };