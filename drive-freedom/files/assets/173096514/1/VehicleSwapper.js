let VehicleSwapper = pc.createScript("VehicleSwapper");

VehicleSwapper.attributes.add("templateName", {type: "string"})

const RADIUS = 7
const RADIUS_SQ = RADIUS*RADIUS;
// Proxity trigger that lets player swap into another vehicle on the map
VehicleSwapper.prototype.initialize = function () {
    this.tmp = new pc.Vec3();
    this.prompted = false;
    this.complete = false;
};

VehicleSwapper.prototype.reset = function () {
    this.entity.enabled = true;
    this.complete = false;
    this.prompted = false;
}

VehicleSwapper.prototype.update = function (dt) {
    if (this.complete) return;

    let player = this.app.game.vehicle;

    let pos = this.entity.getPosition();
    let ppos = player.getPosition();

    this.tmp.sub2(pos,ppos);
    
    if (this.tmp.lengthSq() < RADIUS_SQ) {
        this.app.fire("ui:showbutton", "swap");
        this.app.on("button:click:swapvehicle", this.doSwap, this);
        this.prompted = true;
    } else if (this.prompted) {
        this.app.fire("ui:hidebutton", "swap");
        this.app.off("button:click:swapvehicle", this.doSwap, this);
        this.prompted = false;
    }
}

VehicleSwapper.prototype.doSwap = function () {
    if (this.complete) return;
    this.app.game.switchVehicle(this.templateName);
    this.complete = true;
    this.app.fire("ui:hidebutton", "swap");
    this.entity.enabled = false;
}