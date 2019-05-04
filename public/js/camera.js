const YAW = -90.0;
const PITCH = -45.0;
const SPEED = 5;        // Unit
const SENSITIVITY = 120;
const ZOOM = 45.0;
const POSITION = [0, 10, 10];
class Camera {
    /**
     * Create a new camera instance
     * @class
     * @param  {Float32Array} position [0, 5, 5] by default
     * @param  {Float32Array} up [0, 1, 0] by default
     * @param  {Number} yaw -90.0 by default
     * @param  {Number} pitch -45.0 by default
     */
    constructor(relativePosition = POSITION, up = [0, 1, 0], yaw = YAW, pitch = PITCH) {
        this.Front = glMatrix.vec3.create();
        this.Front[0] = Math.cos(this.Yaw * Math.PI / 180) * Math.cos(this.Pitch * Math.PI / 180);
        this.Front[1] = Math.sin(this.Pitch * Math.PI / 180);
        this.Front[2] = Math.sin(this.Yaw * Math.PI / 180) * Math.cos(this.Pitch * Math.PI / 180);
        this.MovementSpeed = SPEED;
        this.MouseSensitivity = SENSITIVITY;
        this.Zoom = ZOOM;
        this.RelativePosition = relativePosition;
        this.Position = glMatrix.vec3.fromValues(relativePosition[0], relativePosition[1], relativePosition[2]);
        this.WorldUp = up;
        glMatrix.vec3.normalize(this.WorldUp, this.WorldUp);
        this.Right = glMatrix.vec3.create();
        this.Up = glMatrix.vec3.create();
        this.Foward = glMatrix.vec3.create();
        this.Yaw = yaw;
        this.Pitch = pitch;
        this.fieldOfView = 60 * Math.PI / 180;   // in radians
        this.zNear = 0.1;
        this.zFar = 100.0;
        this.updateCameraVectors();
    }


    getRay(x, y) {
        const w = window.innerWidth;
        const h = window.innerWidth;
        const alpha = Math.tan(this.fieldOfView / 2) * w / h * (x - w / 2) / (w / 2);
        const beta = Math.tan(this.fieldOfView / 2) * (h / 2 - y) / (h / 2);
        let ray = {};
        ray.pos = this.Position;
        const alpha_w = glMatrix.vec3.create();
        glMatrix.vec3.scale(alpha_w, this.Right, alpha);
        const beta_v = glMatrix.vec3.create();
        glMatrix.vec3.scale(beta_v, this.Up, beta);
        const neg_w = glMatrix.vec3.create();
        glMatrix.vec3.negate(neg_w, this.RelativePosition);
        glMatrix.vec3.normalize(neg_w, neg_w);
        let temp = glMatrix.vec3.create();
        glMatrix.vec3.add(temp, alpha_w, beta_v);
        glMatrix.vec3.add(temp, temp, neg_w);
        ray.dir = glMatrix.vec3.normalize(glMatrix.vec3.create(), temp);
        return ray;
    }

    setPosition(playerPosition) {
        glMatrix.vec3.add(this.Position, playerPosition, this.RelativePosition);
    }

    getViewMatrix() {
        let output = glMatrix.mat4.create();
        let dir = glMatrix.vec3.create();
        glMatrix.vec3.add(dir, this.Position, this.Front);
        glMatrix.mat4.lookAt(output, this.Position, dir, this.Up);
        return output;
    }

    getProjectionMatrix() {
        const aspect = window.innerWidth / window.innerHeight;
        let output = glMatrix.mat4.create();
        glMatrix.mat4.perspective(output,
            this.fieldOfView,
            aspect,
            this.zNear,
            this.zFar);
        return output;
    }

    // E
    rotateRight(deltaTime) {
        const angle = this.MouseSensitivity * deltaTime;
        this.Yaw += angle;
        this.updateCameraVectors();

        let neg_position = glMatrix.vec3.create();
        let pos_position = glMatrix.vec3.create();
        glMatrix.vec3.subtract(neg_position, this.RelativePosition, this.Position);
        glMatrix.vec3.negate(pos_position, neg_position);

        let translation_to_org = glMatrix.mat4.create();
        glMatrix.mat4.fromTranslation(translation_to_org, neg_position);

        let translation_back = glMatrix.mat4.create();
        glMatrix.mat4.fromTranslation(translation_back, pos_position);

        let rotation = glMatrix.mat4.create();
        glMatrix.mat4.fromYRotation(rotation, glMatrix.glMatrix.toRadian(-angle));

        glMatrix.vec3.transformMat4(this.Position, this.Position, translation_to_org);
        glMatrix.vec3.transformMat4(this.Position, this.Position, rotation);
        glMatrix.vec3.transformMat4(this.RelativePosition, this.RelativePosition, rotation);
        glMatrix.vec3.transformMat4(this.Position, this.Position, translation_back);

    }

    // Q
    rotateLeft(deltaTime) {
        const angle = this.MouseSensitivity * deltaTime;

        this.Yaw -= angle;
        this.updateCameraVectors();

        let neg_position = glMatrix.vec3.create();
        let pos_position = glMatrix.vec3.create();
        glMatrix.vec3.subtract(neg_position, this.RelativePosition, this.Position);
        glMatrix.vec3.subtract(pos_position, this.Position, this.RelativePosition);

        let translation_to_org = glMatrix.mat4.create();
        glMatrix.mat4.fromTranslation(translation_to_org, neg_position);

        let translation_back = glMatrix.mat4.create();
        glMatrix.mat4.fromTranslation(translation_back, pos_position);

        let rotation = glMatrix.mat4.create();
        glMatrix.mat4.fromYRotation(rotation, glMatrix.glMatrix.toRadian(angle));

        glMatrix.vec3.transformMat4(this.Position, this.Position, translation_to_org);
        glMatrix.vec3.transformMat4(this.Position, this.Position, rotation);
        glMatrix.vec3.transformMat4(this.RelativePosition, this.RelativePosition, rotation);
        glMatrix.vec3.transformMat4(this.Position, this.Position, translation_back);
    }

    // moveFoward(deltaTime) {
    //     const velocity = this.MovementSpeed * deltaTime;
    //     let temp = glMatrix.vec3.create();
    //     glMatrix.vec3.scale(temp, this.Foward, velocity);
    //     glMatrix.vec3.add(this.Position, this.Position, temp);
    // }

    // moveBackward(deltaTime) {
    //     const velocity = this.MovementSpeed * deltaTime;
    //     let temp = glMatrix.vec3.create();
    //     glMatrix.vec3.scale(temp, this.Foward, -velocity);
    //     glMatrix.vec3.add(this.Position, this.Position, temp);
    // }

    // moveLeft(deltaTime) {
    //     const velocity = this.MovementSpeed * deltaTime;
    //     let temp = glMatrix.vec3.create();
    //     glMatrix.vec3.scale(temp, this.Right, -velocity);
    //     glMatrix.vec3.add(this.Position, this.Position, temp);
    // }

    // moveRight(deltaTime) {
    //     const velocity = this.MovementSpeed * deltaTime;
    //     let temp = glMatrix.vec3.create();
    //     glMatrix.vec3.scale(temp, this.Right, velocity);
    //     glMatrix.vec3.add(this.Position, this.Position, temp);
    // }

    updateCameraVectors() {
        let front = glMatrix.vec3.create();
        front[0] = Math.cos(this.Yaw * Math.PI / 180) * Math.cos(this.Pitch * Math.PI / 180);
        front[1] = Math.sin(this.Pitch * Math.PI / 180);
        front[2] = Math.sin(this.Yaw * Math.PI / 180) * Math.cos(this.Pitch * Math.PI / 180);
        glMatrix.vec3.normalize(this.Front, front);
        glMatrix.vec3.cross(this.Right, this.Front, this.WorldUp);
        glMatrix.vec3.normalize(this.Right, this.Right);
        glMatrix.vec3.cross(this.Up, this.Right, this.Front);
        glMatrix.vec3.normalize(this.Up, this.Up);
        glMatrix.vec3.cross(this.Foward, this.Right, this.WorldUp);
        glMatrix.vec3.negate(this.Foward, this.Foward);
        glMatrix.vec3.normalize(this.Foward, this.Foward);
    }
}

export default Camera;