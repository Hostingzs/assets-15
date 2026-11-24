class ExhaustEmitter {
    constructor(app, numParticles, interval, lifetime, scaleSpeed, velDecaySpeed) {
        this.app = app;
        this.started = false;
        this.numParticles = numParticles;
        this.scaleSpeed = scaleSpeed;
        this.interval = interval;
        this.lifetime = lifetime;

        this.velDecaySpeed = velDecaySpeed;

        this.components = [];
        this.particles = [];
        this.active = [];
        this.numActive = 0;
        this.pos = new pc.Vec3();
        this.vel = new pc.Vec3();

        let template = this.app.assets.find("Exhaust Template");
        for (let i = 0; i < this.numParticles; i++) {
            this.components.push(template.resource.instantiate());
            this.app.root.addChild(this.components[i]);
            this.particles.push(new ExhaustParticle(new pc.Vec3(), new pc.Vec3(), this.components[i], this.scaleSpeed, this.velDecaySpeed));
            this.active.push(false);
        }

        this.timer = this.interval;
    }

    destroy() {
        this.components.forEach((c) => {
            c.destroy();
            this.app.root.removeChild(c);
        });

        this.particles = [];
        
    }

    start() {
        this.started = true;
    }

    stop() {
        if (!this.started) return;
        this.started = false;
        
        // this.particles.forEach((p, i) => {
        //     this.active[i] = false;
        //     p.deactivate();
        // });
    }

    emit() {
        let nextIndex = this.active.indexOf(false);
        if (nextIndex !== -1) {
            this.numActive++;
            this.active[nextIndex] = true;
            this.particles[nextIndex].pos.copy(this.pos);
            this.particles[nextIndex].vel.copy(this.vel);
            this.particles[nextIndex].activate();
        }
    }

    setPosVel(pos, vel) {
        this.pos = pos;
        this.vel = vel;
    }

    update(dt) {
        if (!this.started && this.numActive === 0) return;

        this.timer -= dt;
        if (this.started && this.timer < 0) {
            this.emit();
            this.timer = this.interval;
        }

        this.particles.forEach((p, i) => {
            if (this.active[i]) {
                p.update(dt);
                if (p.time > this.lifetime) {
                    p.deactivate();
                    this.active[i] = false;
                    this.numActive--;
                }
            }
        });
    }
}

class ExhaustParticle {
    constructor(pos, vel, entity, scaleSpeed, velDecaySpeed) {
        this.pos = pos;
        this.vel = vel;
        this.accel = new pc.Vec3(0, 2, 0);
        this.entity = entity;

        this.time = 0;
        this.scale = 0.1;
        this.scaleSpeed = scaleSpeed;
        this.velDecaySpeed = velDecaySpeed;

        this.tmp = new pc.Vec3();

        this.entity.setLocalScale(0,0,0);
    }

    activate() {
        this.scale = 0.1;
        this.time = 0;
    }

    deactivate() {
        this.scale = 0;
        this.entity.setLocalScale(this.scale, this.scale, this.scale);
    }

    update(dt) {
        this.time += dt;

        this.tmp.copy(this.accel).mulScalar(dt);
        this.vel.add(this.tmp);
        this.tmp.copy(this.vel).mulScalar(dt);

        this.vel.mulScalar(0.9);

        this.pos.add(this.tmp);
        this.scale += this.scaleSpeed * dt;
        this.entity.setLocalPosition(this.pos);
        this.entity.setLocalScale(this.scale, this.scale, this.scale);
    }
}