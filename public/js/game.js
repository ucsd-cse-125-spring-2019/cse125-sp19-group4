const glMatrix = require('gl-Matrix');
const Utils = require('./utils.js')
const { initializeProfession, God, Survivor, SKILL_TYPE } = require('./GameProfession.js');
const { Item, Slime, Tile, Bullet, Tree } = require('./GameUnits.js').Units;
const items = require('./items.js');
const server = require('../../server.js');

const NotificationType = {
    EVENT: "EVENT",
}

class GameInstance {
    constructor(config, physicsEngine) {
        this.survivorCount = 0;
        this.slimeCount = 0;
        this.treeId = 0;
        this.worldHalfWidth = 500;
        this.worldHalfHeight = 500;
        this.winProgress = 100;
        this.curProgress = 0;
        this.clientSockets = [];
        this.socketidToPlayer = {};
        this.survivors = [];
        this.deadSurvivors = [];
        this.liveSurvivors = [];
        this.objects = {};                    // store all objects (players, slimes, trees, etc) on the map
        this.positions = {};
        this.directions = {};
        this.toSend = [];
        this.slimes = [];
        this.initializeMap();                 // build this.map
        this.physicsEngine = physicsEngine;
        this.bulletId = 0;
        this.meleeId = 0;
        this.itemId = 0;
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
        this.loadConfig(config);
        this.generateEnvironment();
    }

    loadConfig(config) {
        this.max_survivors = config.game.max_survivors;
        this.itemDropProb = config.game.item_drop_prob;
        this.treeLowerSize = parseInt(config.map.tree.lower_size);
        this.treeUpperSize = parseInt(config.map.tree.upper_size);
        this.treeNum = config.map.tree.num;
    }

    generateEnvironment() {
        // Generate Tree
        for (let i = 0; i < this.treeNum; i++) {
            let diff = this.treeUpperSize - this.treeLowerSize + 1;
            const size = Math.floor(Math.random() * diff) + this.treeLowerSize;
            const tree = new Tree(this.treeId++, size);
            this.toSend.push(tree.name);
            this.insertObjListAndMap(tree);
            this.physicsEngine.addTree(tree.name, true, tree.size);
        }
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
            for (let i in skills) {
                let skill = skills[i];
                let send = false;

                if (skill.curCoolDown > 0) {
                    skill.curCoolDown -= amount;
                    send = true;
                } else {
                    if (skill.curCoolDown != 0) { //TODO handle case when cooldown is exactly 0 from decrementing 
                        send = true;
                    }
                    skill.curCoolDown = 0;
                    if ('maxCharge' in skill && skill.curCharge < skill.maxCharge) {
                        skill.curCharge++;
                        skill.curCoolDown = skill.coolDown;
                        send = true;
                    }
                }

                if (send) {
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
            this.liveSurvivors.push(survivor.name);
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

    move(name, direction, updateDirectionOnly = false) {
        const obj = this.objects[name];
        if (obj instanceof Survivor) {
            obj.model = 'player_running';
            obj.KEYS.push('model');
        }
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
        const obj = this.objects[name];
        if (obj instanceof Survivor) {
            obj.model = 'player';
            obj.KEYS.push('model');
        }
        this.physicsEngine.stopMovement(name);
    }


    // ==================================== Attack System ===================================
    handleSkill(name, skillParams) {
        const obj = this.objects[name];
        let { skillNum, position } = skillParams;
        let skill = Object.values(obj.skills)[skillNum]

        if (!'maxCharge' in skill && skill.curCoolDown > 0) { // not cooled down
            return;
        }
        if ('maxCharge' in skill && skill.curCharge == 0) {
            return;
        }

        obj.KEYS.push("skills")
        this.toSend.push(name);
        switch (skill.type) {
            case SKILL_TYPE.SELF:
                skill.function(obj, skillParams);
                obj.KEYS.push("status")
                break;

            case SKILL_TYPE.LOCATION:
                if (this.outOfWorld(position)) {
                    console.log("skill out of world");
                    return;
                }
                skill.function(this, skillParams);
                break;

            default:
                console.log("THIS SKILL DOESN'T HAVE A TYPE!!!")
        }
        if (!'maxCharge' in skill) {
            skill.curCoolDown = skill.coolDown;
        } else {
            skill.curCharge -= 1;
        }
    }

    /**
     * TODO: Add more attack forms besides bullet
     * Create a bullet for the attacker
     * @param {string} name the name of object that initiates the attack
     */
    shoot(name) {
        const initiator = this.objects[name];
        if (initiator.attackTimer > 0) {
            return;
        }
        if (name === 'God' && !initiator.canAttack) {
            return;
        }
        const bullet = new Bullet(initiator.position, initiator.direction, this.bulletId++);
        this.toSend.push(bullet.name);

        this.objects[bullet.name] = bullet; // Bullet + id, e.g. Bullet 0
        this.physicsEngine.shoot(name, initiator.direction, 20, initiator.status.STATUS_damage, bullet.name, bullet.radius);
        initiator.attackTimer = initiator.status.STATUS_attackInterval;
    }

    melee(name) {
        const initiator = this.objects[name];
        if (initiator.attackTimer > 0) {
            return;
        }
        if (name === 'God' && !initiator.canAttack) return;
        const meleeId = "Melee " + (this.meleeId++);
        this.physicsEngine.melee(name, initiator.direction, meleeId, initiator.status.STATUS_damage);
        initiator.attackTimer = initiator.status.STATUS_attackInterval;
    }

    //#region Before Step
    // ==================================== Before Step ===================================
    beforeStep() {
        this.clearKeys();
        this.slimesChase();
        this.slimesAttack();
        this.updateAttackTimer();
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

    /**
     * Called before each step to update slimes direction
     */
    slimesChase() {
        const game = this;
        if (this.liveSurvivors.length > 0) {
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
        if (this.liveSurvivors.length > 0) {
            this.slimes.forEach(function (name) {
                const object = game.objects[name];
                if (game.objects[name].attackMode === 'shoot') {
                    game.shoot(name);
                }
                else if (game.objects[name].attackMode === 'melee') {
                    game.melee(name);
                }
            });
        }
    }

    /** Helper: Update attack timer for each object*/
    updateAttackTimer() {
        const game = this;
        Object.keys(this.objects).forEach(function (name) {
            const object = game.objects[name];
            if (typeof object.attackTimer !== 'undefined') {
                if (object.attackTimer > 0) {
                    object.attackTimer--;
                }
            }
        })
    }
    // ==================================== Before Step ===================================
    //#endregion





    //#region After Step
    // ==================================== After Step ===================================
    afterStep() {
        this.useItems();
        this.handleSlimeExplosion();
        this.handleBullets();
        this.checkHealth();
        this.cleanup();
        this.comparePosition();
        this.checkProgress();
    }

    afterSend() {
        this.toClean.length = 0;
        this.toSend.length = 0;
    }

    useItems() {
        const gameInstance = this;
        this.physicsEngine.itemsTaken.forEach(function (name) {
            const item = gameInstance.physicsEngine.obj[name];
            const survivor = gameInstance.objects[item.takenBy];
            survivor.itemEnhance(item.kind);
            gameInstance.toClean.push(name);
        });
    }

    /**
     * Run through 'hits' to handle all the damage in current step 
     */
    handleBullets() {
        const gameInstance = this;
        this.physicsEngine.hits.forEach(function (hit_name) {
            const hit = gameInstance.physicsEngine.obj[hit_name];
            const attacker = gameInstance.objects[hit.from];
            const attackee = gameInstance.objects[hit.to];

            // the melee/bullet hit enemy
            if (typeof attackee !== 'undefined') {
                console.log(hit.from);
                attackee.onHit(gameInstance, hit.damage);
                console.log(attackee.name, 'lost', hit.damage, 'health. Current Health:',
                    attackee.status.STATUS_curHealth, '/', attackee.status.STATUS_maxHealth);
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
            slime.status.STATUS_curHealth = 0;
            console.log(attackee.name, 'lost', slime.status.STATUS_damage, 'health. Current Health:',
                attackee.status.STATUS_curHealth, '/', attackee.status.STATUS_maxHealth);
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

    checkHealth() {
        const gameInstance = this;

        const deadSurvivors = [];
        this.liveSurvivors.forEach(function (name) {
            let survivor = gameInstance.objects[name];
            if (survivor.status.STATUS_curHealth > 0) {
                return;
            }
            deadSurvivors.push(name);
            gameInstance.survivorHasDied(name);
        });
        deadSurvivors.forEach(function (name) {
            const index = gameInstance.liveSurvivors.indexOf(name);
            gameInstance.liveSurvivors.splice(index, 1);
        });

        const deadSlimes = [];
        this.slimes.forEach(function (name) {
            let slime = gameInstance.objects[name]
            if (slime.status.STATUS_curHealth > 0) {
                return;
            }
            deadSlimes.push(name);
            gameInstance.toClean.push(name);
            gameInstance.curProgress += slime.progressPoint;
        });
        deadSlimes.forEach(function (name) {
            gameInstance.generateItem(name);
            gameInstance.slimes.splice(gameInstance.slimes.indexOf(name), 1);
        });
    }

    checkProgress() {
        if (this.curProgress > this.winProgress) {
            // dosomething
        }
    }
    // ==================================== After Step ===================================
    //#endregion




    /**
     * item would be randomly generated when a slime dies
     * @param {string} name name of slime
     */
    generateItem(name) {
        const slime = this.objects[name];
        // Decide whether to drop item
        if (Math.random() < this.itemDropProb) {
            // Randomly generate an item
            const prob = Math.random();
            let kind = null;
            const keys = Object.keys(items)
            let probLowerBound = 0;
            for (let i = 0; i < keys.length; i++) {
                if (probLowerBound >= 1) break;

                const probUpperBound = probLowerBound + items[keys[i]].prob;
                if (probLowerBound <= prob && prob < probUpperBound) {
                    kind = keys[i];
                    break;
                }
                probLowerBound = probUpperBound;
            }

            const itemName = 'Item ' + this.itemId++;
            const item = new Item(itemName, kind);
            this.objects[itemName] = item;
            this.physicsEngine.addItem(itemName, item.kind,
                { x: slime.position[0], y: slime.position[1], z: slime.position[2] });
        }
    }






    initializeFilterFunctions() {
        for (let obj in this.objects) {
            Utils.recursiveSetPropertiesFilter(this.objects[obj]);
        }
    }

    putSlimeOnTheMap(slime) {
        const position = slime.position;
        this.toSend.push(slime.name)
        this.slimeCount++;
        this.insertObjListAndMap(slime);
        this.slimes.push(slime.name);
        this.physicsEngine.addSlime(slime.name, slime.mass, slime.radius,
            { x: position[0], y: position[1], z: position[2] }, slime.status.STATUS_speed, slime.attackMode);
    }

    putTreeOnTheMap(tree) {
        const position = tree.position;
        this.toSend.push(tree.name);
        this.objects[tree.name] = tree;
        this.physicsEngine.addTree(tree.name, 0, tree.size, 0.5, 
            { x: position[0], y: position[1], z: position[2] });
        
    }

    survivorHasDied(name) {
        this.deadSurvivors.push(name);
        if (this.deadSurvivors.length == this.max_survivors) {
            server.endGame(false);
            return;
        }
        server.notifySurvivorDied(name);
    }

    survivorHasRevived(name) {

    }


    /********************* Utils function *********************/
    outOfWorld(position) {
        return Math.abs(Math.floor(position[0])) > this.worldHalfWidth ||
            Math.abs(Math.floor(position[2])) > this.worldHalfHeight
    }
}

module.exports = GameInstance;