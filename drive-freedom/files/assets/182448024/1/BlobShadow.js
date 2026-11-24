let BlobShadow = pc.createScript("BlobShadow");

BlobShadow.attributes.add("index", {type: "number", default: 0});
BlobShadow.attributes.add("bias", {type: "number", default: 0.01});

BlobShadow.prototype.initialize = function () {
    this.vehicle = null;
    this.rayLength = 100;
    this.rayDir = new pc.Vec3(0, -this.rayLength, 0);
    this.rayEnd = new pc.Vec3(0, -1, 0);
    
    this.lookat = new pc.Vec3();
    this.groundForward = new pc.Vec3();
    this.groundRight = new pc.Vec3();
    this.offset = new pc.Vec3();

    this.app.on("game:setvehicle", this.onSetVehicle, this);
};

BlobShadow.prototype.onSetVehicle = function (vehicle) {
    this.vehicle = vehicle;

}

BlobShadow.prototype.update = function (dt) {
    if (this.vehicle) {

        let wheel = this.vehicle.script.CarEntity.car.wheels[this.index];
        let position = wheel.position;

        this.rayEnd.copy(position);
        this.rayEnd.add(this.rayDir);
        let result = this.app.systems.rigidbody.raycastFirst(position, this.rayEnd);
        if (result && result.entity !== this.vehicle) {
            this.entity.render.meshInstances[0].visible = true;
            this.entity.setPosition(result.point);


            if (Math.abs(this.rayDir.dot(result.normal)) < (0.999 * this.rayLength)) {
                this.groundRight.cross(this.rayDir, result.normal);
                this.groundForward.cross(this.groundRight, result.normal).normalize();
            } else {
                this.groundForward.copy(this.vehicle.forward);
                this.groundForward.y = 0;
                this.groundForward.normalize();
            }

            this.lookat.copy(result.point).add(this.groundForward);
            this.entity.lookAt(this.lookat, result.normal);
            this.entity.translate(0, this.bias, 0);
        } else {
            this.entity.render.meshInstances[0].visible = false;
        }
    }
};

