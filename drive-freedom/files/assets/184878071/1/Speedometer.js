let Speedometer = pc.createScript("Speedometer");

const MS_TO_MPH = 2.236936292054;

Speedometer.prototype.initialize = function() {
    this.speedEl = this.entity.findByName("Speed");
    this.bars = this.entity.findByTag("speedo-bar")
    this.speed = 0;

    this.app.on("audio:engine:revs", this.setEngineRevs, this);

    this.onColor = new pc.Color(1,1,1);
    this.offColor = new pc.Color(0.46,0.46,0.46);
}

Speedometer.prototype.update = function(dt) {
    let vehicle = this.app.game.vehicle;
    if (vehicle) {
        this.speed = vehicle.rigidbody.linearVelocity.length() * MS_TO_MPH;
    }

    this.speedEl.element.text = this.speed.toFixed(0);
    this.updateBars();    
}

Speedometer.prototype.updateBars = function () {
    let numBars = this.bars.length;

    const MIN_REVS = 500;
    const MAX_REVS = 4000;

    let barIndex = Math.floor((this.engineRevs - MIN_REVS) / (MAX_REVS - MIN_REVS) * numBars);
    for (let i = 0; i < numBars; i++) {
        this.bars[i].element.color = (i <= barIndex) ? this.onColor : this.offColor;
    }
}

Speedometer.prototype.setEngineRevs = function (revs) {
    this.engineRevs = revs;
}
