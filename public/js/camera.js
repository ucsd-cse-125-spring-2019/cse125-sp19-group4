const YAW = -90.0;
const PITCH = -45.0;
const SPEED = 5;        // Unit
const SENSITIVITY = 50;
const ZOOM = 45.0;
const POSITION = [0, 5, 5];
class Camera {
    /**
     * Create a new camera instance
     * @class
     * @param  {Float32Array} position [0, 5, 5] by default
     * @param  {Float32Array} up [0, 1, 0] by default
     * @param  {Number} yaw -90.0 by default
     * @param  {Number} pitch -45.0 by default
     */
    constructor(position = POSITION, up = [0, 1, 0], yaw = YAW, pitch = PITCH) {
        this.Front = glMatrix.vec3.create();
        this.Front[0] = Math.cos(this.Yaw * Math.PI / 180) * Math.cos(this.Pitch * Math.PI / 180);
        this.Front[1] = Math.sin(this.Pitch * Math.PI / 180);
        this.Front[2] = Math.sin(this.Yaw * Math.PI / 180) * Math.cos(this.Pitch * Math.PI / 180);
        this.MovementSpeed = SPEED;
        this.MouseSensitivity = SENSITIVITY;
        this.Zoom = ZOOM;
        this.Position = position;
        this.WorldUp = up;
        glMatrix.vec3.normalize(this.WorldUp, this.WorldUp);
        this.Right = glMatrix.vec3.create();
        this.Up = glMatrix.vec3.create();
        this.Foward = glMatrix.vec3.create();
        this.Yaw = yaw;
        this.Pitch = pitch;
        this.updateCameraVectors();
    }

    getViewMatrix() {
        let toreturn = glMatrix.mat4.create();
        let dir = glMatrix.vec3.create();
        glMatrix.vec3.add(dir, this.Position, this.Front);
        glMatrix.mat4.lookAt(toreturn, this.Position, dir, this.Up);
        return toreturn;
    }

    // not used
    // processKeyborad(direction, deltaTime) {
    //     let velocity = this.MovementSpeed * deltaTime;
    //     let temp = glMatrix.vec3.create();
    //     if (direction == "Forward") {
    //         glMatrix.vec3.scale(temp, this.Front, velocity);
    //         glMatrix.vec3.add(this.Position, this.Position, temp);
    //     }
    //     if (direction == "Backward") {
    //         glMatrix.vec3.scale(temp, this.Front, -velocity);
    //         glMatrix.vec3.add(this.Position, this.Position, temp);
    //     }
    //     if (direction == "Left") {
    //         glMatrix.vec3.scale(temp, this.Right, -velocity);
    //         glMatrix.vec3.add(this.Position, this.Position, temp);
    //     }
    //     if (direction == "Right") {
    //         glMatrix.vec3.scale(temp, this.Right, velocity);
    //         glMatrix.vec3.add(this.Position, this.Position, temp);
    //     }
    //     this.updateCameraVectors();
    // }

    // moveUp(deltaTime) {
    //     const velocity = this.MovementSpeed * deltaTime;
    //     let temp = glMatrix.vec3.create();
    //     glMatrix.vec3.scale(temp, this.Front, velocity);
    //     glMatrix.vec3.add(this.Position, this.Position, temp);
    //     // this.updateCameraVectors();
    // }

    // moveDown(deltaTime) {
    //     const velocity = this.MovementSpeed * deltaTime;
    //     let temp = glMatrix.vec3.create();
    //     glMatrix.vec3.scale(temp, this.Front, -velocity);
    //     glMatrix.vec3.add(this.Position, this.Position, temp);
    //     // this.updateCameraVectors();
    // }
    
    //Q
    rotateLeft(deltaTime) {
        const angle = this.MouseSensitivity * deltaTime;
        this.Yaw += angle;
        let neg_position = glMatrix.vec3.create();
        glMatrix.vec3.subtract(neg_position, POSITION, this.Position);
        let translation_to_org = glMatrix.mat4.create();
        glMatrix.mat4.fromTranslation(translation_to_org, neg_position);
        let translation_back = glMatrix.mat4.create();
        glMatrix.mat4.transpose(translation_back, translation_to_org);
        let rotation = glMatrix.mat4.create();
        glMatrix.mat4.fromYRotation(rotation, glMatrix.glMatrix.toRadian(-angle));
        glMatrix.vec3.transformMat4(this.Position, this.Position, translation_to_org);
        glMatrix.vec3.transformMat4(this.Position, this.Position, rotation);
        glMatrix.vec3.transformMat4(this.Position, this.Position, translation_back);
        this.updateCameraVectors();
    }

    rotateRight(deltaTime) {
        const angle = this.MouseSensitivity * deltaTime;
        this.Yaw -= angle;
        let neg_position = glMatrix.vec3.create();
        glMatrix.vec3.subtract(neg_position, POSITION, this.Position);
        let translation_to_org = glMatrix.mat4.create();
        glMatrix.mat4.fromTranslation(translation_to_org, neg_position);
        let translation_back = glMatrix.mat4.create();
        glMatrix.mat4.transpose(translation_back, translation_to_org);
        let rotation = glMatrix.mat4.create();
        glMatrix.mat4.fromYRotation(rotation, glMatrix.glMatrix.toRadian(angle));
        glMatrix.vec3.transformMat4(this.Position, this.Position, translation_to_org);
        glMatrix.vec3.transformMat4(this.Position, this.Position, rotation);
        glMatrix.vec3.transformMat4(this.Position, this.Position, translation_back);
        this.updateCameraVectors();
    }

    moveFoward(deltaTime) {
        const velocity = this.MovementSpeed * deltaTime;
        let temp = glMatrix.vec3.create();
        glMatrix.vec3.scale(temp, this.Foward, velocity);
        glMatrix.vec3.add(this.Position, this.Position, temp);
    }

    moveBackward(deltaTime) {
        const velocity = this.MovementSpeed * deltaTime;
        let temp = glMatrix.vec3.create();
        glMatrix.vec3.scale(temp, this.Foward, -velocity);
        glMatrix.vec3.add(this.Position, this.Position, temp);
    }

    moveLeft(deltaTime) {
        const velocity = this.MovementSpeed * deltaTime;
        let temp = glMatrix.vec3.create();
        glMatrix.vec3.scale(temp, this.Right, -velocity);
        glMatrix.vec3.add(this.Position, this.Position, temp);
    }

    moveRight(deltaTime) {
        const velocity = this.MovementSpeed * deltaTime;
        let temp = glMatrix.vec3.create();
        glMatrix.vec3.scale(temp, this.Right, velocity);
        glMatrix.vec3.add(this.Position, this.Position, temp);
    }

    // ProcessMouseMovement(xoffset, yoffset, constrainPitch = true) {
    //     xoffset *= this.MouseSensitivity;
    //     yoffset *= this.MouseSensitivity;
    //     this.Yaw += xoffset;
    //     this.Pitch -= yoffset;
    //     if (constrainPitch) {
    //         if (this.Pitch > 89) {
    //             this.Pitch = 89;
    //         }
    //         if (this.Pitch < -89) {
    //             this.Pitch = -89;
    //         }
    //     }
    //     this.updateCameraVectors();
    // }

    // not used
    // ProcessMouseScroll(yoffset) {
    //     if (this.Zoom >= 1 && this.Zoom <= 45)
    //         this.Zoom -= yoffset;
    //     if (this.Zoom <= 1)
    //         this.Zoom = 1;
    //     if (this.Zoom >= 45)
    //         this.Zoom = 45;
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
        glMatrix.vec3.subtract(this.Foward, glMatrix.vec3.create(), this.Foward);
        glMatrix.vec3.normalize(this.Foward, this.Foward);
    }
}

export default Camera;