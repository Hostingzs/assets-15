// record bonus events like drifing, air time and speeding
let BonusManager = pc.createScript("BonusManager");

BonusManager.prototype.initialize = function () {
    this.drifting = false;
    this.inAir = false;
    this.speed = 0;

    this.driftTimer = 0;
    this.airTimer = 0;
    this.lowSpeedingTimer = 0;
    this.highSpeedingTimer = 0;

    // the built up XP from the current drift/jump/speed. this is scored when the activity stops
    this.currentDriftScore = 0;
    this.currentAirScore = 0;
    this.currentSpeedingScore = 0;

    this.HIGH_SPEEDING_LIMIT = 80 / 2.23;
    this.LOW_SPEEDING_LIMIT = 60 / 2.23;
    this.DRIFT_MULTIPLIER = 100;
    this.AIR_MULTIPLIER = 100;
    this.LOW_SPEED_MULTIPLIER = 100;
    this.HIGH_SPEED_MULTIPLIER = 1000;

    // this.startY = 0;
    // this.lastY = 0;
    // this.oneEighty = false;

    this.startAngles = new pc.Vec3();
    this.lastAngles = new pc.Vec3();
    this.abort = {x:false, y: false, z:false};
    this.oneEighty = {x:false, y:false, z:false};


    this.initialRotation = new pc.Quat();
    this.lastRotation = new pc.Quat();
    this.inverseRotation = new pc.Quat();
    this.relativeRotation = new pc.Quat();
    this.cumulativeRotationAngles = new pc.Vec3();
    this.incRotationAngles = new pc.Vec3();

    this.app.bonusManager = this;
};

function DeltaAngle(current, target)
{
    let delta = target - current;
    delta = delta - Math.floor(delta / 360) * 360;
    if (delta > 180)
    {
        delta -= 360;
    }
    return delta;
}

function Repeat(t, length)
{
    return t - Math.floor(t / length) * length;
}

BonusManager.prototype.setStatus = function (drifting, inAir, speed, rotation, forward, up, right) {
    this.drifting = drifting;

    // starting air time
    if (!this.inAir && inAir) {
       // start air time
        this.initialRotation.copy(rotation);
        this.lastRotation.copy(rotation);
        this.cumulativeRotationAngles.set(0,0,0);
    }

    this.inAir = inAir;
    this.speed = speed;

    // calculate rotation stunts
    if (this.inAir) {
        let iq = this.inverseRotation.copy(this.lastRotation).invert();
        this.relativeRotation.mul2(iq, rotation);
        // let relativeRotation = rotation.mul(iq);
        let relAngles = this.relativeRotation.getEulerAngles();

        this.incRotationAngles.set(
            DeltaAngle(0, relAngles.x),
            DeltaAngle(0, relAngles.y),
            DeltaAngle(0, relAngles.z)
        );
        this.cumulativeRotationAngles.add(this.incRotationAngles);

        // console.log(this.cumulativeRotationAngles);

        if (Math.abs(this.cumulativeRotationAngles.x) > 260) {
            this.cumulativeRotationAngles.x = 0;
            let backflip = this.incRotationAngles.x > 0;
            this.app.fire("bonus:flip", backflip);
            this.app.playerData.changeXp(360);

            let missions = this.app.missionManager.getActiveMissions(MissionTypes.STUNT_MISSION);
            for (let mission of missions) {
                if (backflip) {
                    mission.incrementStat("backflip", 1);
                } else {
                    mission.incrementStat("frontflip", 1);
                }
                
            }
        }
        if (Math.abs(this.cumulativeRotationAngles.y) > 260) {
            this.cumulativeRotationAngles.y = 0;
            this.app.fire("bonus:360");
            this.app.playerData.changeXp(360);

            let missions = this.app.missionManager.getActiveMissions(MissionTypes.STUNT_MISSION);
            for (let mission of missions) {
                mission.incrementStat("360", 1);
            }
        }

        if (Math.abs(this.cumulativeRotationAngles.z) > 180) { // TODO" work out why we only need half the z rotation?
            this.app.fire("bonus:barrelroll");
            this.cumulativeRotationAngles.z = 0;
            this.app.playerData.changeXp(360);

            let missions = this.app.missionManager.getActiveMissions(MissionTypes.STUNT_MISSION);
            for (let mission of missions) {
                mission.incrementStat("barrelroll", 1);
            }
        }

        this.lastRotation.copy(rotation);
    }
};

BonusManager.prototype.update = function (dt) {
    if (this.drifting) {
        this.driftTimer += dt;
    } else {
        // realize current driftscore
        if (this.currentDriftScore) {
            this.app.playerData.changeXp(this.currentDriftScore);

            let missions = this.app.missionManager.getActiveMissions(MissionTypes.BONUS_STAT_MISSION);
            for (let mission of missions) {
                mission.incrementStat("drift", this.currentDriftScore);
            }
        }

        this.driftTimer = 0;
        this.currentDriftScore = 0;
    }

    if (this.inAir) {
        this.airTimer += dt;
    } else {
        if (this.currentAirScore) {
            this.app.playerData.changeXp(this.currentAirScore);

            let missions = this.app.missionManager.getActiveMissions(MissionTypes.BONUS_STAT_MISSION);
            for (let mission of missions) {
                mission.incrementStat("air", this.currentAirScore);
            }

        }
        this.currentAirScore = 0;
        this.airTimer = 0;
    }

    if (this.speed > 0) {
        let missions = this.app.missionManager.getActiveMissions(MissionTypes.BONUS_STAT_MISSION);
        for (let mission of missions) {
            mission.setMaxStatValue("maxspeed", this.speed * 2.23); // mph
        }
    }

    if (this.speed > this.HIGH_SPEEDING_LIMIT) {
        this.highSpeedingTimer += dt;
    } else if (this.speed > this.LOW_SPEEDING_LIMIT) {
        this.lowSpeedingTimer += dt;
    } else {
        if (this.currentSpeedingScore) {
            this.app.playerData.changeXp(this.currentSpeedingScore);

            let missions = this.app.missionManager.getActiveMissions(MissionTypes.BONUS_STAT_MISSION);
            for (let mission of missions) {
                mission.incrementStat("speed", this.currentSpeedingScore);
            }
        }
        this.highSpeedingTimer = 0;
        this.lowSpeedingTimer = 0;
        this.currentSpeedingScore = 0;
    }

    // translate time into score
    this.currentDriftScore = this.driftTimer * this.DRIFT_MULTIPLIER;
    this.currentAirScore = this.airTimer * this.AIR_MULTIPLIER;
    this.currentSpeedingScore = (this.lowSpeedingTimer * this.LOW_SPEED_MULTIPLIER) + (this.highSpeedingTimer * this.HIGH_SPEED_MULTIPLIER);

    if ((this.lowSpeedingTimer > 0.5 || this.highSpeedingTimer > 0)) {
        this.app.fire("bonus:speedingscore", Math.floor(this.currentSpeedingScore));
    }

    if (this.driftTimer > 0.5) {
        this.app.fire("bonus:driftscore", Math.floor(this.currentDriftScore));
    }

    if (this.airTimer > 0.5) {
        this.app.fire("bonus:airscore", Math.floor(this.currentAirScore));
    }


};