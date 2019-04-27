const CANNON = require('../lib/cannon.min.js');
class PhysicsEngine {
    constructor() {
        this.obj = {};
        this.world = new CANNON.World();
        this.world.gravity.set(0, 0, -9.82);
        this.world.broadphase = new CANNON.NaiveBroadphase();
        this.world.solver.iterations = 20;
        this.addGroundPlane();
    }
    
    addPlayer(name, mass = 5, position = {x: 0, y: 0, z: 0}) {
        let halfextents = new CANNON.Vec3(1, 1, 3);
        let cubeShape = new CANNON.Box(halfextents);
        let cubeBody = new CANNON.Body({mass: mass, shape: cubeShape});
        cubeBody.position.set(position.x, position.y, position.z);
        this.world.add(cubeBody);
        this.obj[name] = cubeBody;
    }

    addGroundPlane() {
        // Make a statis ground plane with mass 0
        let groundShape = new CANNON.Plane();
        let groundBody = new CANNON.Body({ mass: 0, shape: groundShape });
        this.world.add(groundBody);
    }

    // addBody(mass = 5, position = {x: 0, y: 0, z: 0}) {
    //     let halfextents = new CANNON.Vec3(5, 5, 5);
    //     let cubeShape = new CANNON.Box(halfextents);
    //     let cubeBody = new CANNON.Body({mass: mass, shape: cubeShape});
    //     cubeBody.position.set(position.x, position.y, position.z);
    //     this.world.add(cubeBody);
    // }

    updateVelocity(name, direction, speed) {
        const direction_vec3 = new CANNON.Vec3(direction[0], direction[1], direction[2]);
        direction_vec3.normalize();
        this.obj[name].velocity = direction_vec3.scale(speed); 
    }
}

module.exports = PhysicsEngine;