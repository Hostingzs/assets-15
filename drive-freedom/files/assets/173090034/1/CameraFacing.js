let CameraFacing = new pc.createScript("CameraFacing");

CameraFacing.prototype.update = function (dt) {
    let camera = this.app.game.gameCamera;
    if (camera) {
        this.entity.lookAt(camera.getPosition(), pc.Vec3.UP);
        this.entity.rotateLocal(0,180,0);
    }
}