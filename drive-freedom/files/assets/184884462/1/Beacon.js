let Beacon = pc.createScript("Beacon");

Beacon.prototype.initialize = function() {
    this.camera = this.app.root.findByName("Game Camera");
    this.p = new pc.Vec3();
}

Beacon.prototype.update = function(dt) {
    if (this.camera) {
        this.p.copy(this.camera.getPosition());
        this.p.y = this.entity.getPosition().y;
        this.entity.lookAt(this.p);
        this.entity.rotateLocal(-90, 0, 0);
    }
}