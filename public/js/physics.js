const CANNON = require('../lib/cannon.min.js');
class PhysicsEngine {
    constructor() {
        this.obj = {};

        // Create the world
        this.world = new CANNON.World();
        this.world.gravity.set(0, 0, -9.82); 
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
    
    addPlayer(name, mass = 5, position = {x: 1, y: 1, z: 1}) {
        let halfextents = new CANNON.Vec3(1, 1, 1);
        let cubeShape = new CANNON.Box(halfextents);
        // Kinematic Box
        // Does only collide with dynamic bodies, but does not respond to any force.
        // Its movement can be controlled by setting its velocity.
        let cubeBody = new CANNON.Body({
            mass: mass, 
            shape: cubeShape,
            type: CANNON.Body.KINEMATIC
        });
        cubeBody.position.set(position.x, position.y, position.z);
        this.world.add(cubeBody);
        this.obj[name] = cubeBody;
    }

    addSlime(name, mass = 10, position = {x: 2, y: 2, z:2}) {
        let halfextents = new CANNON.Vec3(2, 2, 2);
        let cubeShape = new CANNON.Box(halfextents);
        let cubeBody = new CANNON.Body({
            mass: mass, 
            shape: cubeShape,
            material: this.groundMaterial
        });
        cubeBody.position.set(position.x, position.y, position.z);
        this.world.add(cubeBody);
        this.obj[name] = cubeBody;
    }

    addGroundPlane() {
        // Make a statis ground plane with mass 0
        let groundShape = new CANNON.Plane();
        let groundBody = new CANNON.Body({ mass: 0, shape: groundShape});
        this.world.add(groundBody);
        this.ground = groundBody;
    }

    // addBody(mass = 5, position = {x: 0, y: 0, z: 0}) {
    //     let halfextents = new CANNON.Vec3(5, 5, 5);
    //     let cubeShape = new CANNON.Box(halfextents);
    //     let cubeBody = new CANNON.Body({mass: mass, shape: cubeShape});
    //     cubeBody.position.set(position.x, position.y, position.z);
    //     this.world.add(cubeBody);
    // }

    updateVelocity(name, direction, speed) {
        const direction_vec3 = new CANNON.Vec3(direction[0], -direction[2], direction[1]);
        direction_vec3.normalize();
        this.obj[name].velocity = direction_vec3.scale(speed);
        console.log(this.obj['Survivor 0'].velocity.length())
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
            this.obj[name].velocity.setZero();
        }   
    }

    /**
     * Perform jump movement for survivors
     * @param {string} name 
     */
    jump(name) {
        this.obj[name].velocity.set(0, 0, 3);
    }
}

module.exports = PhysicsEngine;