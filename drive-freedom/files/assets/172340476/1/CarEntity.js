var CarEntity = pc.createScript("CarEntity");

const DEFAULT_CAR_PARAMS = {
    ACCEL: 5000,
    BRAKE: 10000,
    RR_COEFF: 1000,
    DRAG_COEFF: 0.5,
    WHEEL_ANGLE_MAX: 0.3,
    WHEEL_RADIUS: 0.3,
    GRIP: [1,1,1,1],
    ROLL_INFLUENCE: 1,
    CORNERING_STIFFNESS: 60000,
    SUSPENSION_STIFFNESS: 150000,
    SUSPENSION_COMPRESSION_FACTOR: 0.5, // proportion of critical damping to apply when suspension is compressing (0 - bouncy; 1 = critical damping)
    SUSPENSION_EXTENSION_FACTOR: 1, // proportion of critical damping to apply when suspension is expanding (0 - bouncy;1 = critical damping)
    SUSPENSION_REST_LENGTH: 0.2,
    SUSPENSION_MAX_LENGTH: 0.3,
    SUSPENSION_MIN_LENGTH: 0.1,
};

CarEntity.attributes.add("vehicleRenderEntity", {type: "entity"}); 
CarEntity.attributes.add("datafile", {type: "asset", assetType: "json"});
CarEntity.attributes.add("skidTexture", {type: "asset", assetType: "texture"});
CarEntity.attributes.add("wheelNames", {type: "string", array:true}); // order should be FL,FR,Bl,BR
CarEntity.attributes.add("attachPointNames", {type: "string", array:true}); // order should be FL,FR,Bl,BR

// use grip curve?
CarEntity.attributes.add('GRIP_FORCE', { type: 'curve' });
CarEntity.attributes.add('ACCEL_FORCE', { type: 'curve' });

const COLLISION_SAFE_TIME = 1;
const COLLISION_DAMAGE_IMPULSE_LIMIT = 5000;
const COLLISION_DAMAGE_IMPULSE_UNIT = 1000;
const COLLISION_DAMAGE_PER_IMPULSE_UNIT = 1;
const FUEL_DISTANCE_UNIT = 10;
const MAX_STUCK_TIMER = 5;

CarEntity.prototype.initialize = function ()
{
    this.timescale = 1;
    this.lastCollisionTime = 0;
    this.lastCollisionDamageTime = 0;
    this.lastCollisionDamageImpulse = 0;
    this.currentRoll = 0; // simulate roll
    this.currentRollVel = 0; // simulate roll
    this.fuelUsageRate = 1;

    this.stuckTimer = 0;

    this.lastPosition = new pc.Vec3();
    this.offset = new pc.Vec3();

    this.params = {};
    this.loadParams(this.datafile.resource);
    this.getOffsets();
    this.car = new WheeledCar(this.entity, this.entity.rigidbody, this.app.systems.rigidbody, this.params);
    
    if (this.skidTexture) {
        // create 4 trail managers for skid marks
        this.trails = [
            new TrailManager(this.app, this.skidTexture.resource, 32),
            new TrailManager(this.app, this.skidTexture.resource, 32),
            new TrailManager(this.app, this.skidTexture.resource, 32),
            new TrailManager(this.app, this.skidTexture.resource, 32)
        ]
    }

    if (this.app.playerData) {
        this.app.playerData.on("healthchange", this.onHealthChange, this);
    }
    this.app.on("game:reset", this.reset, this);
    this.app.on("game:respawn", this.respawn, this);
    this.app.on("player:teleport", this.teleport, this);

    this.entity.rigidbody.group = COLLISION_GROUP_PLAYER;

    this.entity.rigidbody.on("collisionstart", this.onCollisionStart, this);
    this.entity.rigidbody.on("triggerenter", this.onTriggerEnter, this);
    this.entity.rigidbody.on("contact", this.onCollision, this);
    this.entity.on("destroy", this.onDestroy, this);


    this.exhaust = [];
    const EXHAUST_INTERVAL = 0.016;
    const EXHAUST_SCALE_SPEED = 1;
    const EXHAUST_VEL_DECAY_SPEED = 60 * 0.9; // decay velocity by 10 percent every frame
    const EXHAUST_LIFETIME = 0.5;
    const EXHAUST_NUM_PARTICLES = Math.ceil(EXHAUST_LIFETIME / EXHAUST_INTERVAL);
    console.log(`allocating ${EXHAUST_NUM_PARTICLES} particles for exhaust`);
    this.car.wheels.forEach((wheel) => {
        this.exhaust.push(new ExhaustEmitter(this.app, EXHAUST_NUM_PARTICLES, EXHAUST_INTERVAL, EXHAUST_LIFETIME, EXHAUST_SCALE_SPEED, EXHAUST_VEL_DECAY_SPEED));
    });


    // revs, gears for Audio
    this.MIN_REVS = 500;
    this.MAX_REVS = 5000;
    this.revs = this.MIN_REVS;
    this.gear = 1;
    this.numGears = 4;
    this.lastSpeed = 0;
}

CarEntity.prototype.onDestroy = function () {
    this.app.off("game:reset", this.reset, this);
    this.app.off("game:respawn", this.respawn, this);
    this.app.playerData.off("healthchange", this.onHealthChange, this);

    this.exhaust.forEach((e) => {
        e.destroy();
    });
}

CarEntity.prototype.onHealthChange = function (health, previous) {
    let topSpeedFactor = this.entity.script.VehicleDamage.getTopSpeedFactor();
    this.car.setTopSpeedFactor(topSpeedFactor);
};

CarEntity.prototype.postInitialize = function () {
    // use postInitialize to wait for other scripts to initialize first (e.g. VehicleDamage)
    // this.reset();
}

CarEntity.prototype.onCollision = function (contact) {
    let now = Date.now();
    this.lastCollisionTime = now;

};

CarEntity.prototype.onCollisionStart = function (contact) {
    let maxImpulse = 0;
    let totalImpulse = 0
    contact.contacts.forEach((contact) => {
        maxImpulse = Math.max(contact.impulse, maxImpulse);
        totalImpulse += contact.impulse
    });


    let isMissionItem = false;
    // let mission = this.app.missionManager.getCurrentMission();
    let missions = this.app.missionManager.getActiveMissions(MissionTypes.HIT_X_THINGS);
    missions.forEach((mission) => {
        if (!mission.started) return;

        if (contact.other.tags.has(mission.collisionTag)) {
            mission.addCompletedCollision(contact.other);
            isMissionItem = true;
        }
    });

    if (!isMissionItem) {
        let now = Date.now();
        if (now - this.lastCollisionDamageTime > 1000*COLLISION_SAFE_TIME || this.lastCollisionDamageImpulse < totalImpulse) {
            totalImpulse -= COLLISION_DAMAGE_IMPULSE_LIMIT;
            if (totalImpulse > 0) {
                //let damage = COLLISION_DAMAGE_PER_IMPULSE_UNIT * totalImpulse / COLLISION_DAMAGE_IMPULSE_UNIT;
                let damage = 10;
                this.app.fire("vehicle:damage", damage);
                // this.entity.script.VehicleDamage.damage(damage);
                this.lastCollisionDamageImpulse = totalImpulse + COLLISION_DAMAGE_IMPULSE_LIMIT;
                this.lastCollisionDamageTime = now;
            }
        } else {
            // console.log(`skipping damage: ${totalImpulse} > ${this.lastCollisionDamageImpulse}`);
            // console.log(`skipping damage: ${now-this.lastCollisionDamageTime} > ${1000*COLLISION_SAFE_TIME}`);
        }    
    }
    
    // console.log(`totalImpulse: ${totalImpulse}`);
    this.app.fire("audio:collision", totalImpulse);
}

CarEntity.prototype.onTriggerEnter = function (other) {
    // record collisions for missions
    let missions = this.app.missionManager.getActiveMissions(MissionTypes.HIT_X_THINGS);
    missions.forEach((mission) => {
        if (!mission.started) return;
        if (other.tags.has(mission.collisionTag)) {
            mission.addCompletedCollision(other);
        }
    });
}

CarEntity.prototype.teleport = function (pos, forward) {
    this.car.reset(pos, forward);
    this.lastPosition.copy(pos);
};

CarEntity.prototype.getPrimarySpawnPoint = function () {
    let spawnPoints = this.app.root.findByTag("spawnpoint");
    return spawnPoints[0];
}

CarEntity.prototype.getRandomSpawnPoint = function () {
    let spawnPoints = this.app.root.findByTag("spawnpoint");
    let index = Math.floor(Math.random() * spawnPoints.length);
    return spawnPoints[index];
}

CarEntity.prototype.respawn = function (first) {
    this.stuckTimer = 0;
    // teleport to spawn point
    let e;
    if (first) {
        e = this.getPrimarySpawnPoint();
    } else {
        e = this.getRandomSpawnPoint();
    }
    if (e) {
        this.teleport(e.getPosition(), e.forward);
    } else {
        this.teleport(pc.Vec3.ZERO);
    }

    if (!first) {
        // reset health and fuel
        this.app.playerData.setFuel(this.params.FUEL_CAPACITY);
        this.app.playerData.setHealth(this.params.MAX_HEALTH);

        // reset visual damage
        this.entity.script.VehicleDamage.reset(this.params.MAX_HEALTH);
        this.entity.fire("reardoors:reset");
    } else {
        // if health is 0 need to kill the player on start
        if (this.app.playerData.getHealth() <= 0) {
            this.entity.script.VehicleDamage.updateDamagedState();
            this.app.fire("vehicle:died");
        }
    }

}

CarEntity.prototype.resetInPlace = function () {
    this.stuckTimer = 0;

    this.entity.rigidbody.teleport(this.entity.getPosition(), new pc.Vec3(0,1,0));
}


CarEntity.prototype.reset = function () {
    this.stuckTimer = 0;

    this.loadParams(this.datafile.resource);
    this.car = new WheeledCar(this.entity, this.entity.rigidbody, this.app.systems.rigidbody, this.params);

    let e = this.getRandomSpawnPoint();
    if (e) {
        this.teleport(e.getPosition(), e.forward);
    } else {
        this.teleport(pc.Vec3.ZERO);
    }

    // if (this.app.playerData) {
    //     this.app.playerData.setFuel(this.params.FUEL_CAPACITY);
    //     this.app.playerData.setHealth(this.params.MAX_HEALTH);    
    //     this.app.playerData.setMaxHealth(this.params.MAX_HEALTH);
    // }


    this.fuelUsageRate = this.params.FUEL_USAGE_RATE;
    this.app.fire("vehicle:damagereset", this.params.MAX_HEALTH);

    this.entity.fire("reardoors:reset");
}

CarEntity.prototype.loadParams = function (data) {
    Object.keys(data).forEach(key => {
        this.params[key] = data[key];
    });

    this.params.GRIP_CURVE = this.GRIP_FORCE;
    this.params.ACCEL_CURVE = this.ACCEL_FORCE;

    // critical damping for rolling
    this.params.ROLL_DAMPING_COEFF = 2 * Math.sqrt(this.params.ROLL_K * this.entity.rigidbody.mass);

    // some params go into player data
    if (this.app.playerData) {
        this.app.playerData.setMaxHealth(this.params.MAX_HEALTH);
        // this.app.playerData.setHealth(this.params.MAX_HEALTH);
        this.app.playerData.setMaxFuel(this.params.FUEL_CAPACITY);
        // this.app.playerData.setFuel(this.params.FUEL_CAPACITY);    
    }
    
    /// enable / disable debug entities
    let debugs = ["debug_FL","debug_FR", "debug_BL", "debug_BR", "debug_ratio"];
    debugs.forEach((name) => {
        let e = this.entity.findByName(name)
        if (e) {
            e.enabled = this.params.DEBUG_RENDER;   
        }
    });

}

CarEntity.prototype.update = function (dt)
{
    this.car.startFrame();

    // if (this.app.keyboard.wasPressed(pc.KEY_0)) {
    //     this.timescale = 0;
    //     //this.timescale = Math.max(0, this.timescale);
    //     this.app.timeScale = this.timescale;
    // }

    // if (this.app.keyboard.wasPressed(pc.KEY_O)) {
    //     this.timescale -= 0.1;
    //     this.timescale = Math.max(0, this.timescale);
    //     this.app.timeScale = this.timescale;
    // }

    // if (this.app.keyboard.wasPressed(pc.KEY_P)) {
    //     this.timescale += 0.1;
    //     this.timescale = Math.min(1, this.timescale);
    //     this.app.timeScale = this.timescale;
    // }

    let canControl = !this.app.game.isInputDisabled() && this.app.playerData.getFuel() > 0 && this.app.playerData.getHealth() > 0;

    // keyboard input
    if (canControl) {
        if (this.app.input.isPressed(InputAction.ACCELERATE)) {
            this.car.accelerating = 1;
        } else if (this.app.input.isPressed(InputAction.BRAKE)) {
            this.car.accelerating = -1;
        }    

        this.app.vehicleCamera.fire("camera:accelerate", this.car.accelerating);

        if (this.app.input.isPressed(InputAction.LEFT)) {    
            this.car.turning = 1;
        } else if (this.app.input.isPressed(InputAction.RIGHT)) {
            this.car.turning = -1;
        }

        if (this.app.input.isPressed(InputAction.HANDBRAKE)) {
            this.car.handbrake = true;
        } else {
            this.car.handbrake = false;
        }
    }

    // touch input
    if (pc.platform.mobile && window.touchJoypad) {
        var joystickL = window.touchJoypad.sticks['joystickL'];
        // var joystickR = window.touchJoypad.sticks['joystickR'];
        if (joystickL) {
            if (canControl) {
                this.car.accelerating = joystickL.y;
            }
            this.car.turning = -joystickL.x;    
        }
        let buttons = window.touchJoypad.buttons;
        if (buttons) {
            this.car.handbrake = buttons.isPressed('handbrakeButton');
        }
    }

    this.car.update(dt);
    this.updateVisuals(dt);
    this.updateAudio(dt);

    // update fuel
    let position = this.entity.getPosition();
    let onGround = this.car.onGround();
    if (onGround) {
        this.offset.sub2(position, this.lastPosition);
        let d = this.offset.length();
        let fuel = this.app.playerData.getFuel();
        this.app.playerData.changeFuel(-this.fuelUsageRate * d / FUEL_DISTANCE_UNIT);
        fuel = this.app.playerData.getFuel();
        if (fuel <= 0) {
            this.car.setTopSpeedFactor(0);
            this.app.fire("vehicle:outoffuel");
            this.app.fire("ui:showbutton", "watchtorefuel");
        } else {
            this.car.setTopSpeedFactor(1);
        }
        
    }
    this.lastPosition.copy(position);

    // check stuck for upside down
    if (!this.car.onGround() && this.entity.up.dot(pc.Vec3.UP) < LARGE_EPSILON) {
        this.stuckTimer += dt;
        if (this.stuckTimer > MAX_STUCK_TIMER) {
            // destroy car
            // this.app.fire("vehicle:damage", this.app.playerData.getHealth());

            // reset car 
            this.resetInPlace();

        }
    } else {
        this.stuckTimer = 0;
    }

    // update scoring
    let isDrifting = (this.car.numWheelsOnGround === 4) && (this.car.speed > 2.5) && (Math.abs(this.car.speedRatio) > 0.5);
    let isInAir = (this.car.numWheelsOnGround === 0) && ((Date.now() - this.lastCollisionTime) > 500);
    
    this.app.bonusManager.setStatus(isDrifting, isInAir, this.car.speed, this.entity.getRotation(), this.entity.forward, this.entity.right, this.entity.up);

    if (this.params.DEBUG_RENDER) {
        this.app.fire("debug:display", "debug:speed", `${(this.car.speed * 2.237).toFixed(2)}mph`);
        this.app.fire("debug:display", "debug:latspeed", this.car.latSpeed);
        this.app.fire("debug:display", "debug:longspeed", this.car.longSpeed);
        this.app.fire("debug:display", "debug:drifting", `${this.car.drifting}`);
        
        this.debugRender();

        let textElements = [
            this.entity.findByName("debug_FL"),
            this.entity.findByName("debug_FR"),
            this.entity.findByName("debug_BL"),
            this.entity.findByName("debug_BR")
        ];

        for (var i = 0; i < 4; i++) {
            //let sa = this.car.wheels[i].slipAngle * pc.math.RAD_TO_DEG;
            if (textElements[i]) {textElements[i].element.text = `${this.car.wheels[i].speedRatio.toFixed(2)}`;};
        }
        
        let el = this.entity.findByName("debug_ratio")
        if (el) {
            el.element.text = this.car.speedRatio.toFixed(2);
        }
    }

    // check for falling to death
    position = this.entity.getPosition();
    if(position.y < -25) {
        // this.app.fire("vehicle:died");
        this.app.fire("vehicle:damage", this.app.playerData.getHealth());
        // this.app.playerData.changeHealth(-);
    }
    
    
}

CarEntity.prototype.getOffsets = function () {
    // copy offsets from the initial positions of the wheels
   // offset values are used to set the position of the attach points relative to the main entity position
    this.params.OFFSETS = [new pc.Vec3(), new pc.Vec3() ,new pc.Vec3(), new pc.Vec3()];

    for (let i = 0; i < this.attachPointNames.length; i++) {
        let e = this.entity.findByName(this.attachPointNames[i]);
        if (e) {
            this.params.OFFSETS[i].copy(e.getLocalPosition());
        }
    }

    // console.log(`old attach points`);
    // for (let i = 0; i < 4; i++) {
    //     console.log(`${this.params.OFFSETS[i].x}, ${this.params.OFFSETS[i].y}, ${this.params.OFFSETS[i].z}`);
    // }

    let tmp = new pc.Vec3();
    for (let i = 0; i < 4; i++) {
        let e = this.entity.findByName(this.wheelNames[i]);
        tmp.copy(e.getLocalPosition());
        tmp.y += (this.params.SUSPENSION_REST_LENGTH - this.params.SUSPENSION_MIN_LENGTH);
        this.params.OFFSETS[i].copy(tmp);
        // this.car.wheels[i].position.copy(this.params.OFFSETS[i]);
    }
}

CarEntity.prototype._calculateRevRatio = function (topSpeed) {
    const rangePerGear = topSpeed / this.numGears;
    if (rangePerGear > 0) {
        let minRange = rangePerGear * (this.gear-1);
        let maxRange = rangePerGear * this.gear;
        let speed = Math.abs(this.car.longSpeed);
        return (speed - minRange) / (maxRange - minRange);
    } else {
        return 0;    
    }
}

CarEntity.prototype.updateAudio = function (dt) {
    const MPH_TO_MS = 1 / 2.237;
    let topSpeed = this.car.topSpeed * MPH_TO_MS;

    let ratio = this._calculateRevRatio(topSpeed);
    if (ratio > 1) {
        this.gear++;
        ratio = this._calculateRevRatio(topSpeed);
    }
    if (ratio < 0) {
        ratio = 0;
        let speed = Math.abs(this.car.longSpeed);
        if ((speed / topSpeed) < (1 / this.numGears)) {
            this.gear = 1;
        }
    }
 
    let targetRevs = 0;
    // let rangePerGear = (this.MAX_REVS - this.MIN_REVS) / this.numGears;
    if (this.car.onGround()) {
        targetRevs = this.MIN_REVS + (this.MAX_REVS - this.MIN_REVS) * ratio;
    }
    else {
        targetRevs = this.MIN_REVS;
    }
    this.revs = damp(this.revs, targetRevs, 0.95, dt);
    this.app.fire("audio:engine:revs", this.revs);

    this.lastSpeed = this.car.longSpeed;
}


CarEntity.prototype.updateVisuals = function (dt) {
    // update roll
    
    if (this.vehicleRenderEntity) {        
        // spring is force by the lateral velocity on the tires
        let latForceDot = this.entity.right.dot(this.car.totalLateralForce);

        // calculate spring forces
        let force = this.params.ROLL_FACTOR * latForceDot;
        let spring = -(this.params.ROLL_K * this.currentRoll);
        let damping = - (this.params.ROLL_DAMPING_COEFF * this.currentRollVel);
        let accel = (force + spring + damping)  / this.entity.rigidbody.mass; 

        // integrate
        this.currentRollVel += accel * dt;
        this.currentRoll += this.currentRollVel * dt;
        this.currentRoll = pc.math.clamp(this.currentRoll, this.params.ROLL_MIN, this.params.ROLL_MAX);
        
        // update roll angle
        let angles = this.vehicleRenderEntity.getLocalEulerAngles();
        angles.z = this.currentRoll;
        this.vehicleRenderEntity.setLocalEulerAngles(angles);    
    }


    // update wheel rotation
    let wheels = this.wheelNames.map((name) => {return this.entity.findByName(name);});
    for (let i = 0; i < 4; i++) {
        let ea;
        ea = wheels[i].getLocalEulerAngles();
        // let sign = i % 2 ? 1 : -1; // use this if L and R wheels are the same but flipped
        let sign = 1;
        ea.y = sign * this.car.wheels[i].wheelAngle * pc.math.RAD_TO_DEG;
        
        this.car.longSpeed 
        let wheelRotationVelocity = 0;
        if (!this.car.wheels[i].handbrake) {
            wheelRotationVelocity =  - this.car.wheels[i].longSpeed / (2 * Math.PI * this.car.wheels[i].radius);
            // if the car is sliding and accelerating, increase the vel to simulate wheel spin
            this.car.wheels[i].spinning = false;
            if (this.car.wheels[i].speedRatio > 0.5 && this.car.wheels[i].powered && this.car.accelerating) {
                wheelRotationVelocity -= (1.5 * 2 * Math.PI * this.car.wheels[i].speedRatio);
                this.car.wheels[i].spinning = true;
            }
            ea.x +=  2 * pc.math.RAD_TO_DEG * wheelRotationVelocity * dt;
        }
        
        wheels[i].setLocalEulerAngles(ea);
        wheels[i].setPosition(this.car.wheels[i].position);
    }

    this.updateSkidmarks();
    this.updateExhaust(dt);
    
    
}

CarEntity.prototype.updateSkidmarks = function () {
    const WIDTH = 0.8;

    for (let i = 0; i < 4; i++) {
        if (this.car.wheels[i].skidding) {
            this.trails[i].update(WIDTH, this.car.wheels[i].contactPoint, this.car.wheels[i].up);
        } else {
            this.trails[i].stop();
        }
    }
};

CarEntity.prototype.updateExhaust = function (dt) {
    for (let i = 0; i < 4; i++) {
        this.exhaust[i].setPosVel(this.car.wheels[i].contactPoint, this.car.wheels[i].velocity);
        if (this.car.wheels[i].onGround && (this.car.wheels[i].skidding || this.car.wheels[i].spinning)) {
            this.exhaust[i].start();
        } else {
            this.exhaust[i].stop();
        }
        this.exhaust[i].update(dt);
    }
}

CarEntity.prototype.debugRender = function () {
    function scale(v, max) {
        let newv = new pc.Vec3();
        let l = v.length();
        let newLen = l / max;
        newv.copy(v).normalize().mulScalar(newLen);
        return newv;

    }
    let lines = [
        scale(this.car.force, 2000)
    ];

    let colors = [
        new pc.Color(1,0,0),
        new pc.Color(0,1,0),
        new pc.Color(0,0,1),
        new pc.Color(1,1,0),
        new pc.Color(0,1,1),
        new pc.Color(1,0,1),
        new pc.Color(1,1,1)
    ];

    let start = this.entity.getPosition();
    start.y += 0.1;
    let end = new pc.Vec3();
    
    lines.forEach((v, i) => {
        end.copy(start).add(v);
        // end.y += 0.1;
        this.app.drawLine(start, end, colors[i]);
    });

    // wheel debug
    let wcolors = [
        new pc.Color(1,0,0),
        new pc.Color(0,1,0),
        new pc.Color(0,0,1),
        new pc.Color(1,1,0)
    ];
    for (let w = 0; w < 4; w++) {
        let lines = [
            scale(this.car.wheels[w].traction, 2000),
            scale(this.car.wheels[w].brakingForce, 2000),
            scale(this.car.wheels[w].suspensionForce, 2000),
            scale(this.car.wheels[w].lateralForce, 2000)
        ];
    
        let colors = [
            new pc.Color(1,0,0),
            new pc.Color(0,1,0),
            new pc.Color(0,0,1),
            new pc.Color(1,1,0),
            new pc.Color(0,1,1),
            new pc.Color(1,0,1),
            new pc.Color(1,1,1)
        ];
    
        let start = this.car.wheels[w].contactPoint;
        start.y += 0.1;
        let end = new pc.Vec3();
        
        lines.forEach((v, i) => {
            end.copy(start).add(v);
            // end.y += 0.1;
            this.app.drawLine(start, end, wcolors[w], false);
        });   

        drawCross(this.app, this.car.wheels[w].contactPoint, this.car.wheels[w].up, 0.1, colors[w]);
    }    

    this.drawSuspension();
};

CarEntity.prototype.drawSuspension = function () {
    // render debug suspension visualization
    let outvec = new pc.Vec3();
    let start = new pc.Vec3();
    let end = new pc.Vec3();
    let color = new pc.Color();
        
    for (let w = 0; w < 4; w++) {
        this.car.wheels[w].position;
        
        this.car.wheels[w].contactPoint;
        this.car.wheels[w].suspensionLength;
        this.params.SUSPENSION_MAX_LENGTH;
        this.params.SUSPENSION_MIN_LENGTH;

        let mul = w % 2 ? -1 : 1;
        outvec.copy(this.car.wheels[w].right).mulScalar(mul);
        start.copy(this.car.wheels[w].attachPoint);//.add(outvec);
        end.copy(this.car.wheels[w].position);//.add(outvec);

        if (this.car.wheels[w].suspensionLength - this.params.SUSPENSION_MIN_LENGTH < LARGE_EPSILON) {
            // red = min length
            color.set(1,0,0);
        } else if (this.params.SUSPENSION_MAX_LENGTH - this.car.wheels[w].suspensionLength < LARGE_EPSILON) {
            // green = max length
            color.set(0,1,0);
        } else if (this.car.wheels[w].suspensionLength > this.params.SUSPENSION_REST_LENGTH) {
            // cyan = extended
            color.set(0,1,1);
        } else {
            // magenta = compressed
            color.set(1,0,1);
        }

        this.app.drawLine(start, end, color, false); // turn off depth test
        


    }

};

function drawCross(app, pos, up, size, color)
{
    let forward = new pc.Vec3().cross(up, pos);
    if (forward.length() < EPSILON) return;
    
    forward.normalize();
    let right = new pc.Vec3().cross(forward, up);
    forward.mulScalar(0.5 * size);
    right.mulScalar(0.5 * size);

    let start = new pc.Vec3().copy(pos).sub(forward);
    let end = new pc.Vec3().copy(pos).add(forward);
    app.drawLine(start, end, color);

    start.copy(pos).sub(right);
    end.copy(pos).add(right);
    app.drawLine(start, end, color);
}