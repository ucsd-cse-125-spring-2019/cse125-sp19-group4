const CANNON = require('../lib/cannon.min.js');
const glMatrix = require('gl-Matrix');
class PhysicsEngine {
    constructor() {
        this.obj = {};

        // Create the world
        this.world = new CANNON.World();
        this.world.gravity.set(0, -9.82, 0);
        this.world.broadphase = new CANNON.NaiveBroadphase();
        this.world.solver.iterations = 10;

        this.defineMaterial();

        this.addGroundPlane(this.groundMaterial);

        // Store all hits in current step
        this.hits = [];

        // Store all melees in current step
        this.meleeList = [];

        // Store player bodies for reference
        this.survivors = [];

        // Store all monsters for reference
        this.monsters = {};

        // Store slime explosion
        this.slimeExplosion = [];
    }

    defineMaterial() {
        this.groundMaterial = new CANNON.Material("groundMaterial");
        // Adjust constraint equation parameters for ground/ground contact
        let ground_ground_cm = new CANNON.ContactMaterial(this.groundMaterial, this.groundMaterial, {
            friction: 0.2,
            restitution: 0.9,
            contactEquationStiffness: 1e8,
            contactEquationRelaxation: 3,
            frictionEquationStiffness: 1e8,
            frictionEquationRegularizationTime: 3,
        });
        // Add contact material to the world
        this.world.addContactMaterial(ground_ground_cm);

        this.playerMaterial = new CANNON.Material("playerMaterial");
        const player_player_cm = new CANNON.ContactMaterial(this.playerMaterial, this.playerMaterial, { restitution: 0 });
        this.world.addContactMaterial(player_player_cm);
        const player_ground_cm = new CANNON.ContactMaterial(this.groundMaterial, this.playerMaterial, { friction: 0, restitution: 0.01 });
        this.world.addContactMaterial(player_ground_cm);

        this.slimeMaterial = new CANNON.Material("slimeMaterial");
        const slime_ground_cm = new CANNON.ContactMaterial(this.groundMaterial, this.slimeMaterial, { friction: 0, restitution: 0.01 });
        this.world.addContactMaterial(slime_ground_cm);
        const slime_player_cm = new CANNON.ContactMaterial(this.slimeMaterial, this.playerMaterial, { restitution: 0 });
        this.world.addContactMaterial(slime_player_cm);
    }

    addPlayer(name, mass = 20, radius, position = { x: 0, y: 0, z: 0 }, maxJump, isGod = false) {
        // const shape = new CANNON.Sphere(radius);
        const shape = new CANNON.Box(new CANNON.Vec3(radius, radius, radius));
        // Kinematic Box
        // Does only collide with dynamic bodies, but does not respond to any force.
        // Its movement can be controlled by setting its velocity.
        const playerBody = new CANNON.Body({
            mass: mass,
            shape: shape,
            linearDamping: 0.5,
            material: this.playerMaterial,
            // type: CANNON.Body.KINEMATIC
        });
        playerBody.position.set(position.x, position.y + radius, position.z);
        playerBody.jumps = maxJump;
        this.world.add(playerBody);
        this.obj[name] = playerBody;
        playerBody.role = isGod ? 'god' : 'survivor';
        playerBody.name = name;
        playerBody.addEventListener('collide', function (e) {
            // console.log("Collided with: " + e.body.role);
            // console.log("e.contact.bi.role: " + e.contact.bi.role);
            // console.log("e.contact.bj.role: " + e.contact.bj.role);
        })
        if (!isGod) this.survivors.push(playerBody);
    }

    addSlime(name, mass = 5, radius, position = { x: 0, y: 0, z: 0 }, speed = 3, attackMode) {
        // const shape = new CANNON.Sphere(radius);
        const shape = new CANNON.Box(new CANNON.Vec3(radius, radius, radius));
        const slimeBody = new CANNON.Body({
            mass: mass,
            shape: shape,
            linearDamping: 0.9,
            material: this.slimeMaterial
        });

        slimeBody.position.set(position.x, position.y + radius, position.z);
        slimeBody.jumps = 0;
        slimeBody.role = 'enemy';
        slimeBody.name = name;
        slimeBody.movementSpeed = speed;
        this.world.add(slimeBody);
        this.obj[name] = slimeBody;
        this.monsters[name] = slimeBody;

        if (attackMode === 'explode'){
            const engine = this;
            slimeBody.addEventListener("collide", function (e) { 
                if (e.body.role === 'survivor') {
                    engine.slimeExplosion.push({ name: slimeBody.name, attacking: e.body.name });
                }
            })
        }

    }

    addGroundPlane(material) {
        // Make a statis ground plane with mass 0
        const groundShape = new CANNON.Plane();
        const groundBody = new CANNON.Body({ mass: 0, shape: groundShape, material: material });
        groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        groundBody.computeAABB();
        this.world.add(groundBody);
        this.ground = groundBody;
        groundBody.role = 'ground';
    }

    addTree(name, radius = 0.5, position = { x: 20, y: 0, z: -20 }) {
        // tree should be static 
        const treeShape = new CANNON.Box(new CANNON.Vec3(radius, 20 * radius, radius));
        // const treeShape = new CANNON.Cylinder(radius, radius, radius * 10, 10);
        const treeBody = new CANNON.Body({
            mass: 0,
            shape: treeShape
        });
        treeBody.position.set(position.x, position.y, position.z);
        this.world.add(treeBody);
        this.obj[name] = treeBody;
    }

    updateVelocity(name, direction, speed) {
        this.obj[name].velocity.x = direction[0] * speed;
        this.obj[name].velocity.z = direction[2] * speed;
    }

    /**
     * Set kinematic object velocity to 0 so that it stops moving
     * @param {string} name 
     */
    stopMovement(name) {
        this.obj[name].computeAABB();
        if (this.obj[name].aabb.overlaps(this.ground.aabb)) {
            // console.log("collision with ground");
            this.obj[name].velocity.x = 0;
            this.obj[name].velocity.z = 0;
        }
    }

    /**
     * Perform jump movement for survivors
     * @param {string} name 
     */
    jump(name, jumpSpeed, maxJump) {
        this.obj[name].computeAABB();
        if (this.obj[name].aabb.overlaps(this.ground.aabb)) {
            this.obj[name].jumps = maxJump;
        }
        if (this.obj[name].jumps > 0) {
            this.obj[name].velocity.y = jumpSpeed;
            this.obj[name].jumps -= 1;
        }
    }

    cutTree() {
        // Detect the collide but don't attach force
        // attackBody.collisionResponse = 0;
    }

    /**
     * 
     * @param {string} name name of object performing melee attack
     * @param {array} direction face direction
     * @param {string} meleeId a string representing the id of melee, format: Melee + id
     * @param {number} damage damage of initiator when attacking
     */
    melee(name, direction, meleeId, damage) {
        glMatrix.vec3.normalize(direction, direction);
        const initiator = this.obj[name];
        // Represent the melee attack as an object
        const attackShape = new CANNON.Box(new CANNON.Vec3(0.5, initiator.shapes[0].radius, 0.5));
        const attackBody = new CANNON.Body({
            mass: 0,
            shape: attackShape,
        })
        // Set the position of the attack relative to the player
        // let x = initiator.position.x + Math.sign(direction[0].toFixed(5)) * (initiator.shapes[0].radius + 0.5);
        // let y = initiator.position.y + direction[1] * initiator.shapes[0].radius;
        // let z = initiator.position.z + Math.sign(direction[2].toFixed(5)) * (initiator.shapes[0].radius + 0.5);
        const x = initiator.position.x + direction[0].toFixed(5) * (initiator.shapes[0].radius + 0.5);
        const y = initiator.position.y;
        const z = initiator.position.z + direction[2].toFixed(5) * (initiator.shapes[0].radius + 0.5);
        attackBody.position.set(x, y, z); 
        this.world.add(attackBody);

        // Store initiator infomation for the melee body
        this.obj[meleeId] = attackBody;
        this.meleeList.push(meleeId);
        attackBody.role = 'melee';
        attackBody.from = name;
        attackBody.damage = damage;

        const engine = this;
        attackBody.addEventListener("collide", function (e) {
            console.log("Melee hit:", name, "->", e.body.name);
            if (e.body.name != name) {
                if (e.body.role === 'enemy' || e.body.role === 'survivor') {
                    attackBody.to = e.body.name; // TODO: Change to array?
                    engine.hits.push(meleeId);
                }
            }
        })
    }

    /**
     * @param {string} name name of object shooting
     * @param {array} direction face direction
     * @param {number} shootingSpeed speed of shooting
     * @param {number} damage shooting damage
     * @param {string} bulletId name of bullet in the format: bullet + id
     * @param {number} radius radius of bullet
     */
    shoot(name, direction, shootingSpeed, damage, bulletId, radius) {
        glMatrix.vec3.normalize(direction, direction);
        const initiator = this.obj[name];

        //Represent the attack as an object
        const ballShape = new CANNON.Sphere(radius);
        const bulletBody = new CANNON.Body({
            mass: 0.1,
            shape: ballShape,
            linearDamping: 0.1,
        });

        // Set the velocity and its position
        bulletBody.velocity.set( direction[0] * shootingSpeed,
                                 direction[1] * shootingSpeed,
                                 direction[2] * shootingSpeed );
        // const x = initiator.position.x + direction[0] * (initiator.shapes[0].radius+ballShape.radius);
        // const y = initiator.position.y + direction[1] * (ballShape.radius) + 1.5;
        // const z = initiator.position.z + direction[2] * (initiator.shapes[0].radius+ballShape.radius);
        const x = initiator.position.x + direction[0] * (1.414 * initiator.shapes[0].halfExtents.x + ballShape.radius);
        const y = initiator.position.y + direction[1] * (ballShape.radius) + 1.5;
        const z = initiator.position.z + direction[2] * (1.414 * initiator.shapes[0].halfExtents.z + ballShape.radius);
        bulletBody.position.set(x, y, z); 
        this.world.add(bulletBody);

        // Store bullet information
        this.obj[bulletId] = bulletBody;
        // this.bullets.push(bulletBody);
        bulletBody.role = 'bullet';
        bulletBody.from = name; // shot 
        bulletBody.damage = damage;

        const engine = this;
        bulletBody.addEventListener("collide", function(e) {
            console.log("Bullet hit:", name, "->", e.body.name);
            if (e.body.name != name) {
                if (e.body.role === 'enemy') {
                    bulletBody.to = e.body.name; // TODO: Change to array?
                } else if (e.body.role === 'survivor') {
                    console.log("Collide with survivor");
                    bulletBody.to = e.body.name;
                }
            }
            engine.hits.push(bulletId);
        });
    }

    /**
     * Similar to melee, but the created bounding box does not apply 
     * force to the collided object
     * @param {string} name 
     * @param {array} direction 
     * @param {number} interactId 
     */
    interact(name, direction, interactId) {
        // interactBody.collisionResponse = 0;
    }

    /**
     * Clean up the physics engine
     * @param {array} toDestroy list containing all instances to delete from physics engine
     */
    cleanup(toDestroy) {
        const engine = this;
        this.slimeExplosion.forEach(function (e) {
            if (typeof engine.monsters[e.name] !== 'undefined') {
                delete engine.monsters[e.name];
            }
        });
        toDestroy.forEach(function (e) {
            if (typeof engine.obj[e] !== 'undefined') {
                engine.world.removeBody(engine.obj[e]);
                delete engine.obj[e];
            }
        });
        this.meleeList.forEach(function (e) {
            if (typeof engine.obj[e] !== 'undefined') {
                engine.world.removeBody(engine.obj[e]);
                delete engine.obj[e];
            }
        });
        this.meleeList.length = 0;
        this.hits.length = 0;
        this.slimeExplosion.length = 0;
    }
}

module.exports = PhysicsEngine;