let RearDoors = pc.createScript("RearDoors");
RearDoors.attributes.add("leftDoor", {type: "entity"});
RearDoors.attributes.add("rightDoor", {type: "entity"});

function damp(source, target, smoothing, dt) {
    let invsm = 1 - smoothing;
    return pc.math.lerp(source, target, 1 - Math.pow(invsm, dt));
}

RearDoors.prototype.initialize = function () {
    this.leftOpen = false;
    this.rightOpen = false;

    this.entity.on("reardoors:reset", this.reset, this);
    this.entity.on("reardoors:open", () => {
        if (this.leftOpen) {
            this.rightOpen = true;
        } else {
            this.leftOpen = true;
        }
    });

    this.leftY = 0;
    this.rightY  = 0;

    this.leftTargetY = 0;
    this.rightTargetY  = 0;

    this.leftTimer = 0;
    this.rightTimer = 0;
}

RearDoors.prototype.reset = function () {
    this.leftY = 0;
    this.rightY = 0;
    this.leftTargetY = 0;
    this.rightTargetY = 0;
    this.leftOpen = false;
    this.rightOpen = false;
    this.leftDoor.setLocalEulerAngles(0, this.leftY, 0);
    this.rightDoor.setLocalEulerAngles(0, this.rightY, 0);
}

RearDoors.prototype.update = function (dt) {
    if (this.entity.rigidbody && this.leftOpen || this.rightOpen) {
        const FACTOR = 100;
        const rotAccel = FACTOR * this.entity.rigidbody.angularVelocity.y
        const lrand = pc.math.random(0.9, 1.1);
        const rrand = pc.math.random(0.9, 1.1);
        if (this.entity.rigidbody.angularVelocity.y > LARGE_EPSILON) {
            this.leftTargetY += lrand * rotAccel * dt;
            this.rightTargetY += rrand * rotAccel * dt;
        }
        if (this.entity.rigidbody.angularVelocity.y < -LARGE_EPSILON) {
            this.leftTargetY += lrand * rotAccel * dt;
            this.rightTargetY += rrand * rotAccel * dt;
        }

        this.leftTargetY = pc.math.clamp(this.leftTargetY, -90, 0);
        this.rightTargetY = pc.math.clamp(this.rightTargetY, 0, 90);
    }

    if (this.leftOpen) {
        this.leftY = damp(this.leftY, this.leftTargetY, 0.5, dt);
        this.leftDoor.setLocalEulerAngles(0, this.leftY, 0);    
    }

    if (this.rightOpen) {
        this.rightY = damp(this.rightY, this.rightTargetY, 0.5, dt);
        this.rightDoor.setLocalEulerAngles(0, this.rightY, 0);    
    }
};

