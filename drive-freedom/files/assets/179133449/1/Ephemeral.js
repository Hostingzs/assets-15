let EphemeraManager = pc.createScript("EphemeraManager");

const EPHEMERA_TIME = 60 * 1000; // one minute

EphemeraManager.prototype.initialize = function () {
    this.app.on("ephemera:register", this.register, this);

    this._registered = [];
    this._enabled = [];
    
    this.tree = new Quadtree(new pc.Vec3(), new pc.Vec3(1000,0,1000));
};

EphemeraManager.prototype.update = function (dt) {
    let now = Date.now();
    let len = this._registered.length;
    for (let i = 0; i < len; i++) {
        let item = this._registered[i];
        if (item.collisionTime) {
            let dt = now - item.collisionTime;
            if (dt > EPHEMERA_TIME) {
                item.reset();
            }    
        }
    }

    let player = this.app.game.vehicle;
    if (player) {
        let results = this.tree.findAll(player.getPosition(), 10);

        results.forEach((ephemera) => {
            if (this._enabled.indexOf(ephemera) < 0) {
                ephemera.rb.enabled = true;
                this._enabled.push(ephemera);
                // console.log("enabled ephemera");    
            }
        });



        for (let i = 0; i < this._enabled.length; i++) {
            let ephemera = this._enabled[i];
            let p = ephemera.entity.getPosition();
            if (p.distance(player.getPosition()) > 30) {
                ephemera.rb.enabled = false;
                this._enabled.splice(i, 1);
            }
        }
    }
};

EphemeraManager.prototype.register = function (ephemera) {
    this._registered.push(ephemera);
    this.tree.insert(ephemera.entity.getPosition(), ephemera);
};

let Ephemera = pc.createScript("Ephemera");

Ephemera.prototype.initialize = function () {
    this.collisionTime = 0;
    this.origin = this.entity.getLocalPosition().clone();
    this.origin.y += 0.1;
    this.rotation = this.entity.getLocalEulerAngles().clone();

    this.app.fire("ephemera:register", this);
    
    this.rb = null;
    if (this.entity.rigidbody) {
        this.rb = this.entity.rigidbody;
    } else {
        this.rb = this.entity.findComponents('rigidbody')[0];
    }

    this.rb.on("collisionstart", this.onCollision, this);

    this.rb.group = COLLISION_GROUP_EPHEMERA;
    this.rb.mask = COLLISION_GROUP_PLAYER | COLLISION_GROUP_ENVIRONMENT;

    this.rb.enabled = false;
};

Ephemera.prototype.reset = function () {
    this.collisionTime = 0;
    if (this.rb) {
        // console.log(`reseting ephemera to ${this.origin.x},${this.origin.y},${this.origin.z}`)
        this.rb.teleport(this.origin, this.rotation);
        this.rb.linearVelocity = pc.Vec3.ZERO;
        this.rb.angularVelocity = pc.Vec3.ZERO;

        // this.entity.fire("ephemera:reset", this);
    }
}

Ephemera.prototype.onCollision = function (contact) {
    // collision with player
    if (contact.other.script && contact.other.script.CarEntity) {
        this.collisionTime = Date.now();
        // console.log('ephemera collide with player');
    }
};