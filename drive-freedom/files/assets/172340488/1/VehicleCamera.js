let VehicleCamera = pc.createScript("VehicleCamera");

VehicleCamera.attributes.add("offsetY", {type: "number", default: 10});
VehicleCamera.attributes.add("offsetZ", {type: "number", default: 10});
VehicleCamera.attributes.add("lookAtOffsetZ", {type: "number", default: 10});
VehicleCamera.attributes.add("smoothing", {type: "number", default: 0.5});
VehicleCamera.attributes.add("heightsmoothing", {type: "number", default: 0.5});

VehicleCamera.attributes.add("fovMax", {type: "number", default: 60});
VehicleCamera.attributes.add("fovMin", {type: "number", default: 45});
VehicleCamera.attributes.add("fovSpeedMax", {type: "number", default: 50});
VehicleCamera.attributes.add("fovSpeedMin", {type: "number", default: 20});



VehicleCamera.prototype.initialize = function () {
    this.vPos = new pc.Vec3(); // vehicle position
    this.vDir = new pc.Vec3(); // vehicle direction (vel or forward) 
    
    this.offsetF = new pc.Vec3(); // calculated offsets from vehicle
    this.offsetU = new pc.Vec3(); // calculated offsets from vehicle
    this.offsetR = new pc.Vec3(); // calculated offsets from vehicle
    this.offsetZDirection = new pc.Vec3();
    this.diff = new pc.Vec3(); // general offset from target to vehicle

    this.target = new pc.Vec3(); // target position for the camera
    this.prevTarget = new pc.Vec3(); // previous frame's target position for the camera
    
    this.lookAtPos = new pc.Vec3();
    this.vehicle = null;
    this.app.on("game:setvehicle", (vehicle) => {
        this.vehicle = vehicle;
    });

    this.entity.on("camera:accelerate", (accelerating) => {
        this.accelerating = accelerating;
    });

    this.app.vehicleCamera = this.entity;
}

VehicleCamera.prototype.postUpdate = function (dt) {
    if (!this.vehicle || !this.vehicle.rigidbody) {
        return;
    }

    // update FOV
    let vel = this.vehicle.rigidbody.linearVelocity;
    let speed = vel.length();
    let normalized = pc.math.clamp(( speed - this.fovSpeedMin ) / (this.fovSpeedMax - this.fovSpeedMin), 0, 1);
    let fov = this.fovMin + (normalized * (this.fovMax - this.fovMin));
    this.entity.camera.fov = fov;
    
    // dolly zoom to keep car large
    
    // calculate width to remain constant
    let width = this.offsetZ * 2 * Math.tan(pc.math.DEG_TO_RAD * this.fovMin / 2); // 5.7989;
    
    let denom = 2 * Math.tan(pc.math.DEG_TO_RAD * fov / 2);
    let distance = this.offsetZ;
    if (denom !== 0) {
        distance = width / denom;
    }
    let offsetZ = distance;


    
    // update camera position
    this.vPos.copy(this.vehicle.getPosition());
    this.vDir.copy(this.vehicle.rigidbody.linearVelocity);
    let dot = this.vehicle.forward.dot(this.vDir);

    if (this.vDir.length() < LARGE_EPSILON || (dot < 0 && this.accelerating === 0)) {
        //console.log("velocity too low for camera")
        this.vDir.copy(this.vehicle.forward);
    } else {
        this.vDir.normalize();
    }
    
    // calculate offset 
    this.offsetF.copy(this.vDir).mulScalar(-offsetZ);
    this.offsetU.set(0,1,0).mulScalar(this.offsetY);
    // this.offsetR.set(0,0,0);

    this.target.copy(this.vPos).add(this.offsetF).add(this.offsetU);

    // lerp from previous target to new target
    this.target = dampVec(this.target, this.prevTarget, this.target, this.smoothing, dt);
    
    // get pitch and yaw between target point
    this.diff.copy(this.target).sub(this.vPos);
    let targetYaw = Math.atan2(this.diff.x, this.diff.z);
    let height = this.diff.y;
    
    // lerp height
    height = damp(height, this.offsetY, this.heightsmoothing, dt);

    // calculate position from yaw to keep it on "ring" surrounding the car
    this.offsetZDirection.set(Math.sin(targetYaw), 0, Math.cos(targetYaw)).normalize().mulScalar(offsetZ);
    this.target.copy(this.vPos).add(this.offsetZDirection).add(this.offsetU.normalize().mulScalar(height));
    this.entity.setPosition(this.target);
    
    // update previous for next frame
    this.prevTarget.copy(this.target);

    // position look at point on opposite side to camera
    this.lookAtPos.copy(this.vPos).sub(this.target);
    this.lookAtPos.y = 0;
    this.lookAtPos.normalize().mulScalar(this.lookAtOffsetZ);
    this.lookAtPos.add(this.vPos);
    this.entity.lookAt(this.lookAtPos);


}