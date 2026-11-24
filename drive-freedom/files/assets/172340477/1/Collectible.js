let CollectibleSystem = pc.createScript("CollectibleSystem");

const COLLECTION_RADIUS = 3;
const BIG_COLLECTION_RADIUS = 6;
const COLLECTIBLE_RESET_TIME = 30;
const BIG_COLLECTIBLE_RESET_TIME = 120;

CollectibleSystem.prototype.initialize = function () {
    this.app.collectibleRegistry = this;
    this.players = [];
    this.player = null;
    this.list = [];
    this.tmp = new pc.Vec3();
};

CollectibleSystem.prototype.reset = function () {
    this.list.forEach((c) => {
        c.fire("reset");
    })
}

CollectibleSystem.prototype.registerPlayer = function (player) {
    this.players.push(player);
    this.player = player;
};

CollectibleSystem.prototype.unregisterPlayer = function (player) {
    let index = this.players.indexOf(player);
    if (index !== -1) {
        this.players.splice(index, 1);
    }
};

CollectibleSystem.prototype.addCollectible = function (collectible) {
    this.list.push(collectible);
};

CollectibleSystem.prototype.collect = function (collectible) {
    collectible.fire("collected", true); // tell collectible it was picked up
};

CollectibleSystem.prototype.removeCollectible = function (collectible) {
    let index = this.list.indexOf(collectible);
    if (index !== -1) {
        this.list.splice(index, 1);
    }
};

CollectibleSystem.prototype.update = function (dt) {
    let SPEED = 180;

    if (!this.player) return;

    let pp = this.player.getPosition();
    let pfwd = this.player.forward;

    let len = this.list.length;

    for (let i = 0; i < len; i++) {
        let collectible = this.list[i];
        let script = collectible.script.Collectible;
        if (script.collected) {
            script.timer -= dt;
            if (script.timer < 0) {
                script.reset();
            }
            continue;
        }

        let pos = collectible.getPosition();

        this.tmp.sub2(pos, pp);
        let distSq = this.tmp.lengthSq();
        let dot = this.tmp.dot(pfwd);

        // skip if behind player
        if (distSq > 100 && dot < 0) {
            continue;
        }
            
        // skip if far away
        if (distSq > 250*250) {
            continue;
        }

        collectible.rotateLocal(0, SPEED * dt, 0);

        // check for collection
        // this.tmp.copy(pp).sub(collectible.getPosition());
        let r = script.getRadius();
        if (distSq < r*r) {
            collectible.fire("collected", true); // collect whatever the type of collectible
        }
    }
};

let COLLECTIBLE_TYPE = {
    COLLECTIBLE_COIN: 1,
    COLLECTIBLE_FUEL: 2,
    COLLECTIBLE_BIG_COIN: 3,
    COLLECTIBLE_REPAIR: 4
};
let Collectible = pc.createScript("Collectible");
Collectible.attributes.add("type", {
    type: "number",
    title: "Type",
    description: "Select the type of the collectible",
    enum: [
        { "COLLECTIBLE_COIN": COLLECTIBLE_TYPE.COLLECTIBLE_COIN },
        { "COLLECTIBLE_FUEL": COLLECTIBLE_TYPE.COLLECTIBLE_FUEL },
        { "COLLECTIBLE_BIG_COIN": COLLECTIBLE_TYPE.COLLECTIBLE_BIG_COIN },
        { "COLLECTIBLE_REPAIR": COLLECTIBLE_TYPE.COLLECTIBLE_REPAIR }
    ]
})


Collectible.prototype.initialize = function () {
    this.collected = false;
    this.timer = 0;
    this.scale = this.entity.getLocalScale().x;
    this.app.collectibleRegistry.addCollectible(this.entity);
    this.entity.on("collected", this.setCollected, this);
    this.entity.on("reset", this.reset, this);
};

Collectible.prototype.reset = function () {
    this.entity.render.meshInstances[0].visible = true;
    this.collected = false;
    this.timer = 0;
    this.show();
}

Collectible.prototype.getRadius = function () {
    if (this.type === COLLECTIBLE_TYPE.COLLECTIBLE_BIG_COIN) {
        return BIG_COLLECTION_RADIUS;
    } else {
        return COLLECTION_RADIUS;
    }
}

Collectible.prototype.hide = function () {
    this.entity.setLocalScale(0,0,0);
    // this.entity.render.meshInstances[0].visible = false;
}

Collectible.prototype.show = function () {
    this.entity.setLocalScale(this.scale, this.scale, this.scale);
    // this.entity.render.meshInstances[0].visible = false;
}

Collectible.prototype.setCollected = function (collected) {
    this.collected = collected;

    if (this.collected) {
        //this.app.collectibleRegistry.removeCollectible(this.entity);
        // this.entity.render.meshInstances[0].visible = false;
        this.hide();
        this.timer = COLLECTIBLE_RESET_TIME;

        switch (this.type) {
            case COLLECTIBLE_TYPE.COLLECTIBLE_COIN:
                this.app.playerData.changeCoins(10);
                this.app.fire("toast:coins", 10);
                this.app.fire("audio:collect-coin");
                break;
            case COLLECTIBLE_TYPE.COLLECTIBLE_FUEL:
                this.app.playerData.changeFuel(100);
                this.app.fire("toast:fuel", 100);
                break;
            case COLLECTIBLE_TYPE.COLLECTIBLE_BIG_COIN:
                this.app.playerData.changeCoins(1000);
                this.app.fire("toast:coins", 1000);
                this.app.fire("audio:collect-coin");
                this.timer = BIG_COLLECTIBLE_RESET_TIME;
                break;
            case COLLECTIBLE_TYPE.COLLECTIBLE_REPAIR:
//                this.app.playerData.changeHealth(100);
                this.app.fire("vehicle:repair", 100);
                // this.app.fire("toast:health", 100)
                break;

        }
    
    }
};