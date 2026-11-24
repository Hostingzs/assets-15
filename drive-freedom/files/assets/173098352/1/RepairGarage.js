let RepairGarage = pc.createScript("RepairGarage");

RepairGarage.attributes.add("HEALTH_TIME_INCREMENT", {type: "number", default: 2}); // repair rate per increment
RepairGarage.attributes.add("HEALTH_VALUE_INCREMENT", {type: "number", default: 1});

RepairGarage.prototype.initialize = function () {
    this.tmp = new pc.Vec3();
    this.vehicle = null;
    this.door = this.entity.findByName("Door");
    this.innerPoint = this.entity.findByName("Inner Point");
    this.repairTimer = 0;
    this.isPlayerNear = false;
    this.isPlayerInside = false;

    this.app.on("game:setvehicle", (vehicle) => {
        this.vehicle = vehicle;
    });

};

RepairGarage.prototype.postInitialize = function () {
};

RepairGarage.prototype.update = function (dt) {
    if (!this.vehicle) return;

    let testPos = this.door.getPosition();
    let playerPos = this.vehicle.getPosition();

    this.tmp.sub2(testPos, playerPos);
    if (this.tmp.lengthSq() < 7.5 * 7.5) {
        this.updatePlayerNear(dt);
    } else {
        this.updatePlayerFar(dt);
    }

    this.tmp.sub2(this.innerPoint.getPosition(), playerPos);
    if (this.tmp.lengthSq() < 2 * 2) {
        this.updatePlayerRepairing(dt);
    } else {
        if (this.isPlayerInside) {
            this.isPlayerInside = false;
            this.app.fire("ui:hidebutton", "repair");
        }
    
    }
};

RepairGarage.prototype.updatePlayerNear = function (dt) {
    if (!this.isPlayerNear) {
        this.isPlayerNear = true;
        this.door.setLocalEulerAngles(0,0,0);    
    }
};

RepairGarage.prototype.updatePlayerFar = function (dt) {
    if (this.isPlayerNear) {
        this.door.setLocalEulerAngles(90,0,0);
        this.isPlayerNear = false;
    }
}

RepairGarage.prototype.updatePlayerRepairing = function (dt) {
    if (!this.isPlayerInside) {
        this.isPlayerInside = true;
        this.app.fire("ui:showbutton", "repair");
    }

    this.repairTimer -= dt;
    if (this.repairTimer < 0) {
        // this.app.playerData.incrementHealth(this.HEALTH_VALUE_INCREMENT);
        if (this.app.playerData.getHealth() < this.app.playerData.getMaxHealth()) {
            this.app.fire("vehicle:repair", this.HEALTH_VALUE_INCREMENT);    
        }
        this.repairTimer = this.HEALTH_TIME_INCREMENT;
    }
}