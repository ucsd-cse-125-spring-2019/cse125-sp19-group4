const YAW = -90.0;
const PITCH = 0.0;
const SPEED = 5;
const SENSITIVITY = 0.5;
const ZOOM = 45.0;
class Camera {
    /**
     * Create a new camera instance
     * @class
     * @param  {Float32Array} position [0, 0, 0] by default
     * @param  {Float32Array} up [0, 1, 0] by default
     * @param  {Number} yaw -90.0 by default
     * @param  {Number} pitch 0.0 by default
     */
    constructor(position = [0, 0, 0], up = [0, 1, 0], yaw = YAW, pitch = PITCH) {
        this.Front = [0, 0, -1];
        this.MovementSpeed = SPEED;
        this.MouseSensitivity = SENSITIVITY;
        this.Zoom = ZOOM;
        this.Position = position;
        this.WorldUp = up;
        this.Right = glMatrix.vec3.create();
        this.Up = glMatrix.vec3.create();
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

    moveUp(deltaTime) {
        const velocity = this.MovementSpeed * deltaTime;
        let temp = glMatrix.vec3.create();
        glMatrix.vec3.scale(temp, this.Front, velocity);
        glMatrix.vec3.add(this.Position, this.Position, temp);
        this.updateCameraVectors();
    }

    moveDown(deltaTime) {
        const velocity = this.MovementSpeed * deltaTime;
        let temp = glMatrix.vec3.create();
        glMatrix.vec3.scale(temp, this.Front, -velocity);
        glMatrix.vec3.add(this.Position, this.Position, temp);
        this.updateCameraVectors();
    }

    moveLeft(deltaTime) {
        const velocity = this.MovementSpeed * deltaTime;
        let temp = glMatrix.vec3.create();
        glMatrix.vec3.scale(temp, this.Right, -velocity);
        glMatrix.vec3.add(this.Position, this.Position, temp);
        this.updateCameraVectors();
    }

    moveRight(deltaTime) {
        const velocity = this.MovementSpeed * deltaTime;
        let temp = glMatrix.vec3.create();
        glMatrix.vec3.scale(temp, this.Right, velocity);
        glMatrix.vec3.add(this.Position, this.Position, temp);
        this.updateCameraVectors();
    }

    ProcessMouseMovement(xoffset, yoffset, constrainPitch = true) {
        xoffset *= this.MouseSensitivity;
        yoffset *= this.MouseSensitivity;
        this.Yaw += xoffset;
        this.Pitch -= yoffset;
        if (constrainPitch) {
            if (this.Pitch > 89) {
                this.Pitch = 89;
            }
            if (this.Pitch < -89) {
                this.Pitch = -89;
            }
        }
        this.updateCameraVectors();
    }

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
    }
}

export default Camera;