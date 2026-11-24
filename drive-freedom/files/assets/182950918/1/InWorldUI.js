
// handle in world icon/text effects, like damage numbers, etc

let InWorldUI = pc.createScript("InWorldUI");

InWorldUI.attributes.add("xpSprite", {type:"asset", assetType:"sprite"});
InWorldUI.attributes.add("coinsSprite", {type:"asset", assetType:"sprite"});
InWorldUI.attributes.add("healthSprite", {type:"asset", assetType:"sprite"});
InWorldUI.attributes.add("fuelSprite", {type:"asset", assetType:"sprite"});

InWorldUI.attributes.add("duration", {type: "number"});
InWorldUI.attributes.add("speed", {type: "number"});
InWorldUI.attributes.add("acceleration", {type: "number"});
InWorldUI.attributes.add("queueInterval", {type: "number"});


InWorldUI.prototype.initialize = function () {
    let IWToast = this.app.assets.find("IWToast", "template");
    let IWImageToast = this.app.assets.find("IWImageToast", "template");

    const NUM_TOASTS = 7;

    this.toasts = [];
    this.imageToasts = [];
    this.activeToasts = [];//false, false, false, false];
    this.activeImageToasts = [];//false, false, false, false];
    this.toastTimers = [];//0,0,0,0,0];
    this.imageToastTimers = [];//0,0,0,0,0];
    this.y = [];
    this.imageY = [];

    
    for (let i = 0; i < NUM_TOASTS; i++) {
        this.toasts.push(IWToast.resource.instantiate());
        this.entity.addChild(this.toasts[i]);
        this.imageToasts.push(IWImageToast.resource.instantiate());
        this.entity.addChild(this.imageToasts[i]);
        this.activeToasts.push(false);
        this.activeImageToasts.push(false);
        this.toastTimers.push(0);
        this.imageToastTimers.push(0);
        this.y.push(0);
        this.imageY.push(0);
    }

    // this.toasts = [
    //     this.entity.findByName("IWToast1"),
    //     this.entity.findByName("IWToast2"),
    //     this.entity.findByName("IWToast3"),
    //     this.entity.findByName("IWToast4"),
    //     this.entity.findByName("IWToast5")
    // ];
    
    // this.imageToasts = [
    //     this.entity.findByName("IWImageToast1"),
    //     this.entity.findByName("IWImageToast2"),
    //     this.entity.findByName("IWImageToast3"),
    //     this.entity.findByName("IWImageToast4"),
    //     this.entity.findByName("IWImageToast5")
    // ];

    this.camera = this.app.game.gameCamera;
    this.tmp = new pc.Vec3();
    this.tmpPos = new pc.Vec3();
    this.screenPos = new pc.Vec3();

    
    this.numActiveToasts = 0;
    this.imageToastQueue = [];
    this.queueTimer = 0;
    // this.duration = 1;
    // this.speed = 300;
    // this.accel = 100;

    // this.app.playerData.on("healthchange", this.onHealthChange, this);
    // this.app.playerData.on("fuelchange", this.onFuelChange, this);
    // this.app.playerData.on("coinschange", this.onCoinsChange, this);

    this.vehicle = null;
    this.app.on("game:setvehicle", (vehicle) => {
        this.vehicle = vehicle;
    });

    this.app.on("toast:coins", this.onCoinsChange, this);
    this.app.on("toast:health", this.onHealthChange, this);
    this.app.on("toast:fuel", this.onFuelChange, this);
    this.app.on("toast:xp", this.onXpChange, this);
}

InWorldUI.prototype.onHealthChange = function (change) {
    this.getToastStartPosition(this.tmpPos);
    this.queueImageToast(this.tmpPos, "health", change.toFixed(0));
}


InWorldUI.prototype.onCoinsChange = function (change) {    
    this.getToastStartPosition(this.tmpPos);
    this.queueImageToast(this.tmpPos, "coins", change.toFixed(0));
}

InWorldUI.prototype.onFuelChange = function (change) {
    if (change <= 0) return;
    this.getToastStartPosition(this.tmpPos);
    this.queueImageToast(this.tmpPos, "fuel", change.toFixed(0));
}

InWorldUI.prototype.onXpChange = function (change) {
    if (change <= 0) return;
    this.getToastStartPosition(this.tmpPos);
    this.addToast(this.tmpPos, `+${change} XP`);
}

InWorldUI.prototype.update = function (dt) {
    let camPos, carPos; //carUp, up;
    if (this.app.vehicleCamera) {
        camPos = this.app.vehicleCamera.getPosition();
    }
    if (this.app.game.vehicle) {
        carPos = this.app.game.vehicle.getPosition();
    }
    let offset = new pc.Vec3();


    for (let i = 0; i < this.toasts.length; i++) {
        if (this.activeToasts[i]) {
            // this.y[i] += this.speed * dt;
            // float up
            // let p = this.toasts[i].getLocalPosition();
            // p.y += this.speed * dt;
            // p.y = this.y[i];
            // this.toasts[i].setLocalPosition(p);

            this.toastTimers[i] -= dt;
            if (this.toastTimers[i] < 0) {
                this.toasts[i].enabled = false;
                this.toastTimers[i] = 0;
                this.activeToasts[i] = false;
            }

            let time = this.duration - this.toastTimers[i];
            let y = time * this.speed;
            offset.set(0,y,0);
            this.getToastStartPosition(this.tmpPos);
            this.toasts[i].setPosition(this.tmpPos.add(offset));
            if (camPos) {
                this.toasts[i].lookAt(camPos);
                this.toasts[i].rotateLocal(0,180,0);
            }

            this.toasts[i].element.opacity = Math.max(0, (this.toastTimers[i] / this.duration));
        }
    }

    for (let i = 0; i < this.imageToasts.length; i++) {
        if (this.activeImageToasts[i]) {

            this.imageToastTimers[i] -= dt;
            if (this.imageToastTimers[i] < 0) {
                this.imageToasts[i].enabled = false;
                this.imageToastTimers[i] = 0;
                this.activeImageToasts[i] = false;
            }

            let time = this.duration - this.imageToastTimers[i];
            let y = time * this.speed;
            offset.set(0,y,0);
            this.getToastStartPosition(this.tmpPos);
            this.imageToasts[i].setPosition(this.tmpPos.add(offset));
            if (camPos) {
                this.imageToasts[i].lookAt(camPos);
                this.imageToasts[i].rotateLocal(0,180,0);
            }

            this.imageToasts[i].children.forEach((c) => {
                if (c.element) {
                    c.element.opacity = Math.max(0, (this.imageToastTimers[i] / this.duration));
                }
            });

        }
    }

    this.queueTimer -= dt;
    if (this.queueTimer < 0 && this.imageToastQueue.length > 0) {
        this.queueTimer = this.queueInterval;
        let item = this.imageToastQueue.shift();
        if (item) {
            this.addImageToast(item.worldPosition, item.type, item.value);
        }
    }
}

InWorldUI.prototype.getToastStartPosition = function (out) {
    if (this.app.game.vehicle) {
        carPos = this.app.game.vehicle.getPosition();
        carUp = this.app.game.vehicle.up;
        this.tmp = carUp.clone();
        this.tmp.mulScalar(1.5)
    }

    out.copy(carPos).add(this.tmp);
    return out;
}


InWorldUI.prototype.queueToast = function (worldPosition, value) {
    this.toastQueue.push({
        worldPosition: worldPosition,
        value: value
    });
}

InWorldUI.prototype.addToast = function (worldPosition, text) {
    let available = -1;
    for (available = 0; available < this.toasts.length; available++) {
        if (!this.activeToasts[available]) break;
    }

    if (available >= 0 && available < this.toasts.length) {
        let toast = this.toasts[available];
        toast.enabled = true;

        this.setToastText(toast, text);

        this.y[available] = 1.5;
        toast.setPosition(worldPosition);
        // this.worldToScreen(worldPosition, this.screenPos);
        // toast.setPosition(this.screenPos);
        this.toastTimers[available] = this.duration;
        this.activeToasts[available] = true;
        // this.y[available] = toast.getLocalPosition().y;
    } else {
        console.log("no toasts available")
    }
};

InWorldUI.prototype.setToastText = function (toast, text) {
    toast.element.text = text;
}

InWorldUI.prototype.setImageToastText = function (toast, text) {
    let e = toast.children[0];
    e.element.text = text;
}

InWorldUI.prototype.setImageToastImage = function (toast, type) {
    let SPRITES = {
        "xp": this.xpSprite,
        "coins": this.coinsSprite,
        "health": this.healthSprite,
        "fuel": this.fuelSprite
    };
    let e = toast.children[1];
    e.element.spriteAsset = SPRITES[type];
}

InWorldUI.prototype.queueImageToast = function (worldPosition, type, value) {
    this.imageToastQueue.push({
        worldPosition: worldPosition,
        type: type,
        value: value
    });
}

InWorldUI.prototype.addImageToast = function (worldPosition, type, value) {
    let available = -1;
    for (available = 0; available < this.imageToasts.length; available++) {
        if (!this.activeImageToasts[available]) break;
    }

    if (available >= 0 && available < this.imageToasts.length) {
        let toast = this.imageToasts[available];
        toast.enabled = true;
        
        let text = value.toString();
        if (value > 0) {
            text = `+${value}`; // add + sign
        }
        this.setImageToastText(toast, text);
        this.setImageToastImage(toast, type);
        
        // this.worldToScreen(worldPosition, this.screenPos);
        // this.screenPos.set(0,0,0);
        // toast.setPosition(this.screenPos);

        // worldPosition.y += 0.5;
        this.imageY[available] = 1.5;
        toast.setPosition(worldPosition);
        this.imageToastTimers[available] = this.duration;
        this.activeImageToasts[available] = true;
        
    } else {
        console.log("no toasts available")
    }
};

InWorldUI.prototype.worldToScreen = function (worldPos, screenPos) {
    // get screen space co-ord
    this.camera.camera.worldToScreen(worldPos, screenPos);

    // check if the entity is in front of the camera
    if (screenPos.z > 0) {
        // Take into account of pixel ratio
        var pixelRatio = this.app.graphicsDevice.maxPixelRatio;
        screenPos.x *= pixelRatio;
        screenPos.y *= pixelRatio;

        var device = this.app.graphicsDevice;

        screenPos.x = ((screenPos.x / device.width) * 2) - 1
        screenPos.y = ((1 - (screenPos.y / device.height)) * 2) - 1
        return screenPos;
    }
};

