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

        this.groundMaterial = new CANNON.Material("groundMaterial");
        // Adjust constraint equation parameters for ground/ground contact
        var ground_ground_cm = new CANNON.ContactMaterial(this.groundMaterial, this.groundMaterial, {
            friction: 0.2,
            restitution: 0.3,
            contactEquationStiffness: 1e8,
            contactEquationRelaxation: 3,
            frictionEquationStiffness: 1e8,
            frictionEquationRegularizationTime: 3,
        });
        // Add contact material to the world
        this.world.addContactMaterial(ground_ground_cm);

        this.addGroundPlane();

        // Store all hits in current step
        this.hits = [];

        // Store all melees in current step
        this.meleeList = [];
    }

    addPlayer(name, mass = 20, radius, position = { x: 0, y: 0, z: 0 }, maxJump) {
        const ballShape = new CANNON.Sphere(radius);
        // Kinematic Box
        // Does only collide with dynamic bodies, but does not respond to any force.
        // Its movement can be controlled by setting its velocity.
        const playerBody = new CANNON.Body({
            mass: mass,
            shape: ballShape,
            linearDamping: 0.5,
            // type: CANNON.Body.KINEMATIC
        });
        playerBody.position.set(position.x, position.y + radius, position.z);
        playerBody.jumps = maxJump;
        this.world.add(playerBody);
        this.obj[name] = playerBody;
        playerBody.role = 'player';
        playerBody.name = name;
        playerBody.addEventListener('collide', function(e){
            // console.log("Collided with: " + e.body.role);
            // console.log("e.contact.bi.role: " + e.contact.bi.role);
            // console.log("e.contact.bj.role: " + e.contact.bj.role);
        })
    }

    addSlime(name, mass = 5, radius, position = { x: 0, y: 0, z: 0 }) {
        const ballShape = new CANNON.Sphere(radius);
        const slimeBody = new CANNON.Body({
            mass: mass,
            shape: ballShape,
            linearDamping: 0.9,
        });
        slimeBody.position.set(position.x, position.y + radius, position.z);
        slimeBody.jumps = 0;
        slimeBody.role = 'enemy';
        slimeBody.name = name;
        this.world.add(slimeBody);
        this.obj[name] = slimeBody;
    }

    addGroundPlane() {
        // Make a statis ground plane with mass 0
        const groundShape = new CANNON.Plane();
        const groundBody = new CANNON.Body({ mass: 0, shape: groundShape });
        groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        groundBody.computeAABB();
        this.world.add(groundBody);
        this.ground = groundBody;
        groundBody.role = 'ground';
    }

    addTree(name, radius = 1, position = {x: 20, y: 0, z: -20}) {
        // tree should be static 
        const treeShape = new CANNON.Cylinder(radius, radius, radius*2, 10);
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
     */
    melee(name, direction, meleeId) {
        glMatrix.vec3.normalize(direction, direction);
        const player = this.obj[name];
        // Represent the melee attack as an object
        const attackShape = new CANNON.Box(new CANNON.Vec3(0.5, player.shapes[0].radius, 0.5));
        const attackBody = new CANNON.Body({
            mass: 0,
            shape: attackShape,
        })

        // Set the position of the attack relative to the player
        // let x = player.position.x + Math.sign(direction[0].toFixed(5)) * (player.shapes[0].radius + 0.5);
        // let y = player.position.y + direction[1] * player.shapes[0].radius;
        // let z = player.position.z + Math.sign(direction[2].toFixed(5)) * (player.shapes[0].radius + 0.5);
        const x = player.position.x + direction[0].toFixed(5) * (player.shapes[0].radius + 0.5);
        const y = player.position.y;
        const z = player.position.z + direction[2].toFixed(5) * (player.shapes[0].radius + 0.5);
        attackBody.position.set(x, y, z); 
        this.world.add(attackBody);

        // Store initiator infomation for the melee body
        this.obj[meleeId] = attackBody;
        this.meleeList.push(meleeId);
        attackBody.role = 'melee';
        attackBody.from = name;
        
        const engine = this;
        attackBody.addEventListener("collide", function(e) {
            console.log("Melee hit:", name, "->", e.body.name);
            if (e.body.role === 'enemy') {
                attackBody.to = e.body.name; // TODO: Change to array?
                engine.hits.push(meleeId);
            }
            else if (e.body.role === 'player') {
            }
        })   
    }
    
    /**
     * @param {string} name name of object shooting
     * @param {array} direction face direction
     * @param {number} shootingSpeed speed of shooting
     * @param {string} bulletId name of bullet in the format: bullet + id
     */
    shoot(name, direction, shootingSpeed, bulletId) {
        glMatrix.vec3.normalize(direction, direction);
        const player = this.obj[name];

        //Represent the attack as an object
        const ballShape = new CANNON.Sphere(0.2);
        const bulletBody = new CANNON.Body({
            mass: 0.1,
            shape: ballShape,
            linearDamping: 0.7    
        });

        // Set the velocity and its position
        bulletBody.velocity.set( direction[0] * shootingSpeed,
                                 direction[1] * shootingSpeed,
                                 direction[2] * shootingSpeed );
        const x = player.position.x + direction[0] * (player.shapes[0].radius+ballShape.radius);
        const y = player.position.y + direction[1] * (ballShape.radius) + 1.5;
        const z = player.position.z + direction[2] * (player.shapes[0].radius+ballShape.radius);
        bulletBody.position.set(x, y, z); 
        this.world.add(bulletBody);
    
        // Store bullet information
        this.obj[bulletId] = bulletBody;
         // this.bullets.push(bulletBody);
        bulletBody.role = 'bullet';
        bulletBody.from = name; // shot 

        const engine = this;
        bulletBody.addEventListener("collide", function(e) {
            console.log("Bullet hit:", name, "->", e.body.name);
            if (e.body.role === 'enemy') {
                bulletBody.to = e.body.name; // TODO: Change to array?
            } else if (e.body.role === 'player') {
                bulletBody.to = e.body.name;
            }
            engine.hits.push(bulletId);
        });
    }

    /**
     * Clean up the physics engine
     * @param {array} toDestroy list containing all instances to delete from physics engine
     */
    cleanup(toDestroy) {
        const engine = this;
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
    }
}

module.exports = PhysicsEngine;