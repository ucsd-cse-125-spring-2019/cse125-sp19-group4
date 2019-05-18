const glMatrix = require('gl-Matrix');
const Utils = require('./utils.js')
const { initializeProfession, God, Survivor, SKILL_TYPE } = require('./GameProfession.js');
const { Item, Slime, Tile, Bullet, Tree } = require('./GameUnits.js').Units;

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
        this.positions = {};
        this.directions = {};
        this.toSend = [];
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

        const tree = new Tree(this.treeId++);
        this.toSend.push(tree.name);
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
        for (let name in this.skillables) {
            let skills = this.skillables[name].skills;
            for (let skill in skills) {
                if (skills[skill].curCoolDown > 0) {
                    skills[skill].curCoolDown -= amount;
                    this.skillables[name].KEYS.push("skills");
                } else if (skills[skill].curCoolDown < 0) {
                    skills[skill].curCoolDown = 0;
                    this.skillables[name].KEYS.push("skills");
                }
            }
            this.toSend.push(name)
        }
    }

    joinAsGod(socketid) {
        if (typeof this.god === 'undefined') {
            this.playerCount.GodCount += 1;
            this.god = new God(socketid);
            this.toSend.push(this.god.name);

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
            this.toSend.push(survivor.name);

            initializeProfession(survivor, msg);
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

    move(name, direction, updateDirectionOnly=false) {
        const obj = this.objects[name];
        const speed = obj.status.STATUS_speed;
        if (updateDirectionOnly) 
            this.physicsEngine.updateVelocity(name, direction, 0);
        else
            this.physicsEngine.updateVelocity(name, direction, speed);
        obj.direction = direction;
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

        obj.KEYS.push("skills")
        this.toSend.push(name);
        switch(skill.type) {
            case SKILL_TYPE.SELF: 
                skill.function(obj);
                obj.KEYS.push("status")
                break;
            default: 
                skill.function(this, skillParams);
        }
        skill.curCoolDown = skill.coolDown;
    }

    /**
     * TODO: Add more attack forms besides bullet
     * Create a bullet for the attacker
     * @param {string} name the name of object that initiates the attack
     */
    shoot(name) {
        const initiator = this.objects[name];
        const bullet = new Bullet(initiator.position, initiator.direction, this.bulletId++);
        this.toSend.push(bullet.name);

        this.objects[bullet.name] = bullet; // Bullet + id, e.g. Bullet 0
        this.physicsEngine.shoot(name, initiator.direction, 20, initiator.status.STATUS_damage, bullet.name, bullet.radius);
    }

    melee(name) {
        const initiator = this.objects[name];
        const meleeId = "Melee " + (this.meleeId++);
        this.physicsEngine.melee(name, initiator.direction, meleeId, initiator.status.STATUS_damage);
    }

    // ==================================== Before Step ===================================
    beforeStep() {
        this.clearKeys();
        this.slimesChase();
        this.updateAttackTimer();
        this.slimesAttack();
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

    /**
     * Called before each step to initiate slime attack
     */
    slimesAttack() {
        const game = this;
        if (this.survivors.length > 0) {
            this.slimes.forEach(function (name) {
                const object = game.objects[name];
                if (object.attackTimer == object.attackInterval) {
                    if (game.objects[name].attackMode === 'shoot') {
                        game.shoot(name);
                    }
                    else if (game.objects[name].attackMode === 'melee') {
                        game.melee(name);
                    }
                    object.attackTimer --;
                } 
            });
        }
    }

    /** Helper: Update attack timer for each object*/ 
    updateAttackTimer() {
        const game = this;
        this.slimes.forEach(function (name) {
            const object = game.objects[name];
            if (object.attackTimer < 0) object.attackTimer = object.attackInterval;
            else if (object.attackTimer < object.attackInterval) object.attackTimer --; 
        })
    }

    // ==================================== After Step ===================================
    afterStep() {
        this.handleSlimeExplosion();
        this.handleDamage();
        this.cleanup();
        this.comparePosition();
    }

    afterSend() {
        this.toClean.length = 0;
        this.toSend.length = 0;
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
                console.log(hit.from);
                attackee.onHit(gameInstance, hit.damage);
                console.log(attackee.name, 'lost', hit.damage, 'health. Current Health:', attackee.status.STATUS_curHealth, '/', attackee.status.STATUS_maxHealth);

                if (attackee.status.STATUS_curHealth <= 0) {
                    // Remove slime from slimes list
                    if (gameInstance.objects[attackee.name] instanceof Slime) {
                        const index = gameInstance.slimes.indexOf(attackee.name);
                        if (index > -1) {
                            gameInstance.slimes.splice(index, 1);
                        }
                    }
                    gameInstance.toClean.push(attackee.name);
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
            attackee.onHit(gameInstance, slime.status.STATUS_damage);
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
        this.physicsEngine.cleanup(this.toClean);
        const gameInstance = this;
        this.toClean.forEach(function (name) {
            if (typeof gameInstance.objects[name] !== 'undefined') {
                delete gameInstance.objects[name];
            }
        });
        this.physicsEngine.cleanup(this.toClean);
        // this.toClean.length = 0; // moved to afterSend()
        // this.meleeId = 0; // Each melee would only last 1 step
    }

    comparePosition() {
        const objects = this.objects;
        const positions = this.positions;
        const directions = this.directions;
        Object.keys(objects).forEach((name) => {
            const obj = objects[name];
            if (typeof positions[name] === 'undefined' || typeof directions[name] === 'undefined') {
                positions[name] = obj.position;
                directions[name] = obj.direction;
                this.toSend.push(name);
                if ('KEYS' in obj) {
                    obj.KEYS.push('position');
                    obj.KEYS.push('direction');
                }
                return;
            }
            if (!glMatrix.vec3.equals(positions[name], obj.position)) {
                this.toSend.push(name);
                if ('KEYS' in obj) {
                    obj.KEYS.push('position');
                }
            }
            if (!glMatrix.vec3.equals(directions[name], obj.direction)) {
                this.toSend.push(name);
                if ('KEYS' in obj) {
                    obj.KEYS.push('direction');
                }
            }
            positions[name] = obj.position;
            directions[name] = obj.direction;
        });
    }

    // at the begining of each loop, set all omitable properties to not be sent,
    // if those properties are modified during this cycle, add them back to send them.
    clearKeys() {
        for (let obj in this.skillables) {
            this.skillables[obj].KEYS = this.skillables[obj].KEYS.filter(item => item !== "skills");
        }
        for (let obj in this.objects) {
            if ('KEYS' in this.objects[obj]) {
                this.objects[obj].KEYS.length = 0;
            }
        }
    }

    initializeFilterFunctions() {
        for (let obj in this.objects) {
            Utils.recursiveSetPropertiesFilter(this.objects[obj]);
        }
    }
}

module.exports = GameInstance;