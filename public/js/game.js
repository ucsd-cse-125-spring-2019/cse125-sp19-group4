const glMatrix = require('gl-Matrix');
const Utils = require('./utils.js')
const { initializeProfession, God, Survivor, SKILL_TYPE } = require('./GameProfession.js');
const { Item, Slime, Bullet, Tree, Tower } = require('./GameUnits.js').Units;
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
        this.onGoingSkills = {};
        this.toSend = [];
        this.sound = [];
        this.slimes = [];
        this.physicsEngine = physicsEngine;
        this.bulletId = 0;
        this.meleeId = 0;
        this.itemId = 0;
        this.interactId = 0;
        this.toClean = [];
        this.skillables = {};
        this.loadConfig(config);
        this.generateEnvironment();
        this.locationLottery = [0, 1, 2, 3]; // Each representing upper left, upper right, lower left, lower right
        this.monsterSpawnTimer = 0;
        this.monsterSpawnProb = this.monsterSpawnBaseProb;
        this.monsterSpawnIncreaseSlope = (1 - this.monsterSpawnBaseProb)/this.monsterSpawnFullProbTime;
    }

    loadConfig(config) {
        this.worldHalfWidth = Number(config.map.width) / 2;
        this.worldHalfHeight = Number(config.map.height) / 2;
        this.max_survivors = Number(config.game.max_survivors);
        this.itemDropProb = config.game.item_drop_prob;
        this.monsterSpawnBaseProb = Number(config.game.monster_spawn_base_prob);
        this.monsterSpawnAmount = Number(config.game.monster_spawn_amount);
        this.monsterSpawnFullProbTime = Number(config.game.monster_spawn_full_prob_time);
        this.monsterSpawnInterval = Number(config.game.monster_spawn_interval); //in game tick;
        this.towerHealth = Number(config.game.tower_health);        
        this.treeLowerSize = parseInt(config.map.tree.lower_size);
        this.treeUpperSize = parseInt(config.map.tree.upper_size);
        this.treeNum = config.map.tree.num;
        this.minDistanceSurvivorTree = Number(config.minDistanceToSurvivor.tree);
        this.minDistanceSurvivorSlime = Number(config.minDistanceToSurvivor.slime);
    }

    generateEnvironment() {
        // Add tower at the center
        this.tower = new Tower(this.towerHealth);
        this.putTowerOnTheMap(this.tower);

        // Generate Tree
        for (let i = 0; i < this.treeNum; i++) {
            let diff = this.treeUpperSize - this.treeLowerSize + 1;
            const size = Math.floor(Math.random() * diff) + this.treeLowerSize;
            const tree = new Tree(this.treeId++, size);
            this.putTreeOnTheMap(tree, true);
        }

        for (let i = -this.worldHalfHeight; i <= this.worldHalfHeight; i += 5) {
            const tree1 = new Tree(this.treeId++, 2, false);
            tree1.position = [-this.worldHalfWidth, 0, i];
            this.putTreeOnTheMap(tree1, false);
            const tree2 = new Tree(this.treeId++, 2, false);
            tree2.position = [this.worldHalfWidth, 0, i];
            this.putTreeOnTheMap(tree2, false);
        }
        for (let i = -this.worldHalfWidth; i <= this.worldHalfWidth; i += 5) {
            const tree1 = new Tree(this.treeId++, 2, false);
            tree1.position = [i, 0, -this.worldHalfHeight];
            this.putTreeOnTheMap(tree1, false);
            const tree2 = new Tree(this.treeId++, 2, false);
            tree2.position = [i, 0, this.worldHalfHeight];
            this.putTreeOnTheMap(tree2, false);
        }
    }

    insertObjListAndMap(obj) {
        if (obj.name in this.objects) {
            throw obj.name + " already in objects";
        }
        this.objects[obj.name] = obj; // store reference
    };

    decrementCoolDown(amount) {
        for (let name in this.skillables) {
            let skills = this.skillables[name].skills;
            for (let i in skills) {
                let skill = skills[i];
                let send = false;

                if (skill.curCoolDown > 0) {
                    if (!('maxCharge' in skill) || skill.maxCharge != skill.curCharge) {
                        skill.curCoolDown -= amount;
                        send = true;
                    }
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

    joinAsGod(socketid, name) {
        this.god = new God(socketid);
        this.toSend.push(this.god.name);

        this.clientSockets.push(socketid);
        this.socketidToPlayer[socketid] = this.god;
        this.insertObjListAndMap(this.god);
        this.physicsEngine.addPlayer(this.god.name, this.god.mass, this.god.radius, { x: 0, y: 10, z: 0 }, this.god.maxJump, true);
        this.skillables[this.god.name] = this.god
    };

    joinAsSurvivor(socketid, msg, name) {
        const survivor = new Survivor(socketid, name);
        this.toSend.push(survivor.name);

        initializeProfession(survivor, msg);
        this.survivorCount++;
        this.survivors.push(survivor);
        this.liveSurvivors.push(survivor.name);
        this.clientSockets.push(socketid);
        this.socketidToPlayer[socketid] = survivor;
        this.insertObjListAndMap(survivor);
        this.initializePlayerLocation(survivor);
        this.physicsEngine.addPlayer(survivor.name, survivor.mass, survivor.radius,
            { x: survivor.position[0], y: survivor.position[1], z: survivor.position[2] }, survivor.maxJump, false);
        this.skillables[survivor.name] = survivor;
    }

    checkEnoughPlayer() {
        if (typeof this.god === 'undefined' || this.survivors.length < this.max_survivors) {
            return false;
        }
        return true;
    }

    initializePlayerLocation(survivor) {
        const index = Math.floor(Math.random() * this.locationLottery.length);
        switch (this.locationLottery[index]) {
            case 0:
                // upper left
                survivor.position = [-this.worldHalfWidth + 5, 20, -this.worldHalfHeight + 5];
                survivor.direction = [0, 0, 1];
                break;
            case 1:
                // upper right
                survivor.position = [this.worldHalfWidth - 5, 20, -this.worldHalfHeight + 5];
                survivor.direction = [0, 0, 1];
                break;
            case 2:
                // lower left
                survivor.position = [-this.worldHalfWidth + 5, 20, this.worldHalfHeight - 5];
                survivor.direction = [0, 0, -1];
                break;
            case 3:
                // lower right
                survivor.position = [this.worldHalfWidth - 5, 20, this.worldHalfHeight - 5];
                survivor.direction = [0, 0, -1];
                break;
        }
        this.locationLottery.splice(index, 1);
    }

    numPlayersStatusToString() {
        return this.survivors.length + '/' + this.max_survivors + ' survivor'
            + (this.survivors.length < 2 ? '' : 's') + ' and '
            + (typeof this.god === 'undefined' ? '0' : '1') + '/1 god';
    }

    move(name, direction, updateDirectionOnly = false) {
        const obj = this.objects[name];
        if (obj instanceof Survivor) {
            if (!obj.dead && obj.model != 'player_running') {
                obj.model = 'player_running';
                obj.KEYS.push('model');
            }
        }
        const speed = obj.status.speed;
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
            if (!obj.dead && obj.model != 'player_standing') {
                obj.model = 'player_standing';
                obj.KEYS.push('model');
            }
        }
        this.physicsEngine.stopMovement(name);
    }


    // ==================================== Attack System ===================================
    handleSkill(name, skillParams) {
        const obj = this.objects[name];
        let { skillNum, position } = skillParams;
        let skill = Object.values(obj.skills)[skillNum];
        let skillSucceeed = false;

        if (!('maxCharge' in skill) && skill.curCoolDown > 0) { // not cooled down
            return;
        }
        if ('maxCharge' in skill && skill.curCharge == 0) {
            return;
        }

        obj.KEYS.push("skills")
        this.toSend.push(name);
        switch (skill.type) {
            case SKILL_TYPE.SELF:
                skillSucceeed = skill.function(obj, skillParams);
                obj.KEYS.push("status")
                break;

            case SKILL_TYPE.LOCATION:
                if (this.outOfWorld(position)) {
                    return;
                }
                skillSucceeed = skill.function(this, obj, skillParams)
                break;
            
            case SKILL_TYPE.SHOOT:
                skillSucceeed = skill.function(this, obj, skillParams)
                break;

            case SKILL_TYPE.ONGOING:
                skillSucceeed = skill.function(this, obj, skillParams);
                break;

            default:
                console.log("THIS SKILL DOESN'T HAVE A TYPE!!!")
        }

        if (skillSucceeed || skillSucceeed == undefined) {
            if (typeof skill.sound !== 'undefined') {
                this.sound.push(skill.sound);
            }
            if ('maxCharge' in skill) {
                skill.curCharge -= 1;
            } else {
                skill.curCoolDown = skill.coolDown;
            }
        }

    }

    /**
     * Create a bullet for the attacker
     * @param {string} name the name of object that initiates the attack
     */
    shoot(name, speed, damage, radius) {
        const initiator = this.objects[name];
        if (name === 'God' && !initiator.canAttack) {
            return;
        }
        const bullet = new Bullet(initiator.position, initiator.direction, radius, this.bulletId++);
        this.toSend.push(bullet.name);

        this.objects[bullet.name] = bullet; // Bullet + id, e.g. Bullet 0
        this.physicsEngine.shoot(name, initiator.direction, speed, damage, bullet.name, bullet.radius);
        initiator.attackTimer = initiator.status.attackInterval;
    }

    melee(name) {
        const initiator = this.objects[name];
        if (name === 'God' && !initiator.canAttack) return;
        const meleeId = "Melee " + (this.meleeId++);
        this.physicsEngine.melee(name, initiator.direction, meleeId, initiator.status.damage);
        initiator.attackTimer = initiator.status.attackInterval;
    }

    //#region Before Step
    // ==================================== Before Step ===================================
    beforeStep() {
        this.clearKeys();
        this.slimesChase();
        this.clearTempBuff();
        this.handleOnGoingSkills();
        this.updateAttackTimer();
        this.slimesAttack();
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
                if (object.attackTimer > 0) {
                    return;
                }
                if (object.attackMode === 'shoot') {
                    game.shoot(name, 20, object.status.damage, 0.2);
                }
                else if (object.attackMode === 'melee') {
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

    clearTempBuff() {
        let gameInstance = this;
        this.survivors.forEach(function (survivor) {
            for (let key in survivor.tempBuff) {
                if (key === 'toJSON') {
                    continue;
                }
                survivor.tempBuff[key] = 0;
            }
        })
    }

    // Execute the ongoings skills and reclculate status if needed
    handleOnGoingSkills() {
        let gameInstance = this;
        for (let key in this.onGoingSkills) {
            let skill = gameInstance.onGoingSkills[key];
            let invoker = skill.invoker;

            if (skill.isSelfBuff) {
                gameInstance.toSend.push(invoker.name);
                invoker.KEYS.push('status')
                invoker.KEYS.push('tempBuff')
            }

            skill.duration -= 1 / server.tick_rate;
            if (skill.duration < 0) {
                if (skill.endEffect !== null) {
                    skill.endEffect(gameInstance, invoker);
                }
                delete gameInstance.onGoingSkills[key];
            } else {
                skill.effect(gameInstance, invoker);
            }
        }

        // The reason we do it here is that we don't know who has been buffed
        // by aoe
        this.survivors.forEach(function (survivor) {
            gameInstance.calculatePlayerStatus(survivor.name);
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
        this.spawnMonster();
        this.comparePosition();
        this.checkProgress();
    }

    afterSend() {
        this.toClean.length = 0;
        this.toSend.length = 0;
        this.sound.length = 0;
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
                attackee.onHit(gameInstance, hit.damage);
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
            attackee.onHit(gameInstance, slime.status.damage);
            slime.status.curHealth = 0;
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

        this.liveSurvivors.forEach(function (name) {
            const survivor = gameInstance.objects[name];
            if (survivor.status.curHealth > 0) {
                return;
            }
            gameInstance.survivorHasDied(name);
        });

        this.slimes.forEach(function (name) {
            const slime = gameInstance.objects[name]
            if (slime.status.curHealth > 0) {
                return;
            }
            console.log(name, 'died');
            if (typeof slime.skill_model !== 'undefined' && slime.skill_model !== '') {
                gameInstance.toClean.push(slime.skill_model);
            }
            gameInstance.toClean.push(name);
            gameInstance.generateItem(name);
            gameInstance.slimes.splice(gameInstance.slimes.indexOf(name), 1);
        });
            
            
    }


    checkProgress() {
        // if (this.curProgress > this.winProgress) {
        if (this.tower.curHealth <= 0) {
            server.endGame(true);
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

    /**
     * Randomly spawn monster
     */
    spawnMonster() { 
        // Adjust spawn probability
        this.adjustSpawnProb();

        if (this.monsterSpawnTimer < this.monsterSpawnInterval) {
            this.monsterSpawnTimer++;
            return;
        }
        // console.log(this.monsterSpawnProb);
        const monsterLottery = [0, 0, 1, 1, 2, 2];
        if (Math.random() < this.monsterSpawnProb) {
            // spawn monsters
            for (let i = 0; i < this.monsterSpawnAmount; i++) {
                // Randomly generate monster type 
                const pick = Math.floor(Math.random() * monsterLottery.length);
                let monster = null;
                switch (monsterLottery[pick]) {
                    case 0:
                        // generate explosion monster
                        monster = new Slime(this.slimeCount, "explode");
                        break;
                    case 1:
                        // generate shooting monster
                        monster = new Slime(this.slimeCount, "shoot");
                        break;
                    case 2:
                        // generate melee monster
                        monster = new Slime(this.slimeCount, "melee");
                        break;
                }

                // Randomly generate monster position
                const radius = monster.radius;
                do {
                    do {
                        monster.position[0] = Math.floor(Math.random() * (this.worldHalfWidth * 2 - Math.ceil(radius)) + Math.ceil(radius)) - this.worldHalfWidth;
                        monster.position[1] = 2;
                        monster.position[2] = Math.floor(Math.random() * (this.worldHalfHeight * 2 - Math.ceil(radius)) + Math.ceil(radius)) - this.worldHalfHeight;
                    } while (Math.abs(monster.position[0]) < 10 || Math.abs(monster.position[2]) < 10); // TODO: Change 10 to better match with center obelisk 
                } while (!this.putSlimeOnTheMap(monster));    
            }
            if (this.monsterSpawnAmount > 0) {
                server.sendServerChatMessage(this.monsterSpawnAmount + ' wild monsters have spawned')
            }
        }
        this.monsterSpawnTimer = 0;
    }

    /**
     * Helper function to adjust spawn interval when game progresses
     */
    adjustSpawnProb() {
        if (this.monsterSpawnProb < 1) this.monsterSpawnProb += this.monsterSpawnIncreaseSlope;
    }

    initializeFilterFunctions() {
        for (let obj in this.objects) {
            Utils.recursiveSetPropertiesFilter(this.objects[obj]);
        }
    }

    putSlimeOnTheMap(slime) {
        if (this.checkIfTooCloseToSurvivor(slime.position, this.minDistanceSurvivorSlime)) return false;
        const position = slime.position;
        this.toSend.push(slime.name)
        this.slimeCount++;
        this.insertObjListAndMap(slime);
        this.slimes.push(slime.name);
        this.physicsEngine.addSlime(slime.name, slime.mass, slime.radius,
            { x: position[0], y: position[1], z: position[2] }, slime.status.speed, slime.attackMode);
        return true;
    }

    /**
     * @param {object} tree tree object
     * @param {boolean} randomLocation whether to randomly generate location in physics engine
     */
    putTreeOnTheMap(tree, randomLocation) {
        if (!randomLocation && this.checkIfTooCloseToSurvivor(tree.position, this.minDistanceSurvivorTree)) 
            return false;
        if (!randomLocation && Math.hypot(tree.position[0], tree.position[2]) < 5)
            return false;
        const position = tree.position;
        this.toSend.push(tree.name);
        this.objects[tree.name] = tree;
        if (tree.physics) {
            this.physicsEngine.addTree(tree.name, randomLocation, tree.size, 0.5,
                { x: position[0], y: position[1], z: position[2] });
        }
        return true;
    }

    putTowerOnTheMap(tower) {
        this.toSend.push(tower.name);
        this.objects[tower.name] = tower;
        this.physicsEngine.addTower(tower.name, tower.radius);
    }

    survivorHasDied(name) {
        const obj = this.objects[name];
        obj.model = 'player_die';
        obj.KEYS.push('model');
        obj.position[1] += 2;
        obj.KEYS.push('position');
        obj.dead = true;
        this.deadSurvivors.push(name);
        this.liveSurvivors.splice(this.liveSurvivors.indexOf(name), 1);
        if (this.deadSurvivors.length == this.max_survivors) {
            server.endGame(false);
            return;
        }
        this.physicsEngine.handleSurvivorDeath(name);
        server.notifySurvivorDied(name);
        server.notifyAll(name + " was killed!", NotificationType.EVENT)
    }

    survivorHasRevived(name) {
        this.objects[name].dead = false;
        this.liveSurvivors.push(name);
        this.deadSurvivors.splice(this.deadSurvivors.indexOf(name), 1);
        this.physicsEngine.handleSurvivorRevival(name);
        server.notifySurvivorRevived(name);
        server.notifyAll(name + " has been revived!", NotificationType.EVENT)
    }


    /********************* Utils function *********************/
    outOfWorld(position) {
        return Math.abs(Math.floor(position[0])) > this.worldHalfWidth ||
            Math.abs(Math.floor(position[2])) > this.worldHalfHeight
    }

    checkIfTooCloseToSurvivor(position, allowedDistance) {
        for (let i = 0; i < this.liveSurvivors.length; i++) {
            if (glMatrix.vec3.distance(this.objects[this.liveSurvivors[i]].position, position) < allowedDistance)
                return true;
        }
        return false;
    }

    calculatePlayerStatus(name) {
        let survivor = this.objects[name];
        for (let key in survivor.baseStatus) {
            if (key === "toJSON") {
                continue;
            }
            survivor.status[key] = survivor.baseStatus[key] + survivor.buff[key] + survivor.tempBuff[key];
        }
        survivor.status.attackInterval = Math.ceil(server.tick_rate / survivor.status.attackSpeed);
    }

    getObjInRadius(position, radius) {
        let result = []
        for (let key in this.objects) {
            let obj = this.objects[key];
            let distance = Utils.calculateDistance(obj.position, position);
            if (distance < radius) {
                result.push(obj)
            }
        }
        return result;
    }

}

module.exports = GameInstance;