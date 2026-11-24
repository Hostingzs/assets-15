let Pulse = pc.createScript("Pulse");

Pulse.attributes.add("speed", {type: "number", default: 1});
Pulse.attributes.add("frequency", {type: "number", default: 1});
Pulse.attributes.add("amplitude", {type: "number", default: 1});

Pulse.prototype.initialize = function () {
    this.timer = 0;
    
}

Pulse.prototype.update = function (dt) {
    if (dt === 0) {
        dt = 1 / 60;
    }
    this.timer += dt;

    let x = 1 + Math.sin(this.timer * this.frequency) * this.amplitude;
    let y = 1 + Math.sin(this.timer * this.frequency) * this.amplitude;

    this.entity.setLocalScale(x, y, 1);
}
