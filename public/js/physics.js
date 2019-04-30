const CANNON = require('../lib/cannon.min.js');
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
    }

    addPlayer(name, mass = 20, position = { x: 1, y: 1, z: 1 }) {
        const ballShape = new CANNON.Sphere(1);
        // Kinematic Box
        // Does only collide with dynamic bodies, but does not respond to any force.
        // Its movement can be controlled by setting its velocity.
        const playerBody = new CANNON.Body({
            mass: mass,
            shape: ballShape,
            linearDamping: 0.5,
            // type: CANNON.Body.KINEMATIC
        });
        playerBody.position.set(position.x, position.y, position.z);
        playerBody.jumps = 2;
        this.world.add(playerBody);
        this.obj[name] = playerBody;
    }

    addSlime(name, mass = 5, position = { x: 2, y: 2, z: 2 }) {
        const ballShape = new CANNON.Sphere(1);
        const slimeBody = new CANNON.Body({
            mass: mass,
            shape: ballShape,
            linearDamping: 0.9,
        });
        slimeBody.position.set(position.x, position.y, position.z);
        slimeBody.jumps = 0;    // can't jump
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
            // console.log(this.obj[name].aabb);
            this.obj[name].jumps = 2;
            this.obj[name].velocity.x = 0;
            this.obj[name].velocity.z = 0;
        }
    }

    /**
     * Perform jump movement for survivors
     * @param {string} name 
     */
    jump(name) {
        if (this.obj[name].jumps > 0) {
            this.obj[name].velocity.y = 5;
            this.obj[name].jumps -= 1;

        }
    }
}

module.exports = PhysicsEngine;