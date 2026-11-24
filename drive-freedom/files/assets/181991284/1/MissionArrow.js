let MissionArrow = pc.createScript("MissionArrow");


MissionArrow.attributes.add("heightOffset", {type: "number", default: 2});
MissionArrow.attributes.add("smoothing", {type: "number", default: 0.75});

MissionArrow.prototype.initialize = function () {
    this.tmp = new pc.Vec3();
    this.currentTarget = new pc.Vec3();

    this.displayed = true;
};

MissionArrow.prototype.update = function (dt) {
    let mission = this.app.missionManager.getCurrentMission();
    let arrow = this.entity.findByName("arrow");

    if (mission && !mission.hasCurrentLocation()) {
        arrow.enabled = false;
        this.displayed = false;            
        return;
    }

    if (!mission && this.displayed) {
        arrow.enabled = false;
        this.displayed = false;
    } else if (mission && !this.displayed) {
        arrow.enabled = true;
        this.displayed = true;
    }

    let Y = 2; // default

    // set position to be above player
    if (this.app.game.vehicle) {
        let pos = this.app.game.vehicle.getPosition();
        Y = pos.y + this.heightOffset
        this.entity.setPosition(pos.x, Y, pos.z);
    }

    // set direction to point at current location
    if (mission) {
        let target = mission.getCurrentLocation();
        if (target) {
            tmp.set(target.x, Y, target.z);
            dampVec(this.currentTarget, this.currentTarget, tmp, this.smoothing, dt);            
            this.entity.lookAt(this.currentTarget);
        }

    }
};
