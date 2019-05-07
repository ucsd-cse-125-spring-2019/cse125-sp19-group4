//http://nehe.gamedev.net/tutorial/particle_engine_using_triangle_strips/21001/
class Particle {
    constructor() {
        this.active = false;
        this.life = 0.0;
        this.fade = 0.0;
        this.red = 0.0;
        this.green = 0.0;
        this.blue = 0.0;
        this.x = 0.0;
        this.y = 0.0;
        this.z = 0.0;
        this.xi = 0.0;
        this.yi = 0.0;
        this.zi = 0.0;
        this.xg = 0.0;
        this.yg = 0.0;
        this.zg = 0.0;
        this.colors[12][3]=               // Rainbow Of Colors
        [
            [1.0,0.5,0.5],[1.0,0.75,0.5],[1.0,1.0,0.5],[0.75,1.0,0.5],
            [0.5,1.0,0.5],[0.5,1.0,0.75],[0.5,1.0,1.0],[0.5,0.75,1.0],
            [0.5,0.5,1.0],[0.75,0.5,1.0],[1.0,0.5,1.0],[1.0,0.5,0.75]
        ];
    }
}

class Particles {
    constructor(pos, num) {
        this.position = pos;
        this.number = num;
        this.particles = [this.number];
        for(let i = 0; i < this.number; ++i) {
            let temp = new Particle();
            //let x = random(pos.x - 1.0, pos.x + 1.0);
            //let y = random(pos.y - 1.0, pos.y + 1.0);
            //let z = random(pos.z - 1.0, pos.z + 1.0);
            //temp.x = x;
            //temp.y = y;
            //temp.z = z;
            particles[i] = temp;
        }
    }

    Update() {
        for(let i = 0; i < this.number; ++i) {
            particles[i].active = true;
            particles[i].life = 1.0;
            particle[i].float = Math.random() / 10.0 + 0.003;
        }
    }
}