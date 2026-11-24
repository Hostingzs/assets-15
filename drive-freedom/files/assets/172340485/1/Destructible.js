var Destructible = pc.createScript("Destructible");

Destructible.attributes.add("minConversionImpulse", {type:"number", default: 5000});
Destructible.attributes.add("particle", {type: "entity"});

const DESTRUCTIBLE_RESET_TIME = 60;

let tmp = new pc.Vec3();

Destructible.prototype.initialize = function () {
    this.converted = false;
    this.timer = -1;

    // this.renderComponents = this.entity.findComponents("render");

    if (this.entity.collision) {
        this.entity.collision.on("triggerenter", this._onCollision, this);
    } else {
        let collision = this.entity.findComponents("collision")[0];
        collision.on("triggerenter", this._onCollision, this);
    }
    this.app.destructibleManager.register(this);
}

Destructible.prototype._onCollision = function (other) {
    // if (result.other.tags.has("player")) {wws
        // this.entity.enabled = false;
        this.timer = DESTRUCTIBLE_RESET_TIME;
        // this.particle.enabled = true;   
        let p = this.entity.getPosition();
        this.particle.setPosition(p.x, 0, p.z);
        this.particle.setRotation(other.getRotation());
        this.particle.particlesystem.reset()
        this.particle.particlesystem.play();

        this.hide();

        this.app.fire("audio:destructiblehit");
    // }
}

Destructible.prototype.hide = function () {
    this.app.playerData.changeXp(10)
    this.app.fire("toast:xp", 10);

    this.entity.enabled = false;
}

Destructible.prototype.show = function () {
    this.entity.enabled = true;
}


Destructible.prototype.update = function (dt) {

}



var DestructibleManager = pc.createScript("DestructibleManager");


DestructibleManager.prototype.initialize = function () {
    this.destructibles = [];
    this.app.destructibleManager = this;
};

DestructibleManager.prototype.register = function (destructible) {
    this.destructibles.push(destructible);
};


DestructibleManager.prototype.update = function (dt) {
    this.destructibles.forEach((d) => {
        if (d.timer > 0) {
            d.timer -= dt;
            if (d.timer < 0) {
                // d.entity.enabled = true;
                d.show();
                // d.reset();
            }
        }
    });
}

