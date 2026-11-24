var EngineAudioManager = pc.createScript('EngineAudioManager');

// Initialize the script
EngineAudioManager.prototype.initialize = function() {
    this.fxEnabled = true;

      this.app.on("audio:engine:revs", this.setEngineRevs, this);
      this.app.on("game:pause", this.onPause, this);
      this.app.on("game:unpause", this.onUnpause, this);
      this.engineType = 'city_engine';

      this.app.on("game:switchvehicle", this.switchVehicle, this);

      this.app.on("audio:toggleFx", this.toggleFx, this);
};

EngineAudioManager.prototype.postInitialize = function () {
    this.fxEnabled = this.app.game.isFxEnabled();
    if (this.fxEnabled) {
        this.startEngineLoop();
    }
}

EngineAudioManager.prototype.setEngineType = function (engineType) {
    this.engineType = engineType;
    this.startEngineLoop();

}

// Play engine start sound
EngineAudioManager.prototype.startEngineLoop = function() {
    if (!this.fxEnabled) return;
    this.entity.sound.stop();
    this.entity.sound.slot(this.engineType).play();
};

// update engine based on revs in range 0-6000
EngineAudioManager.prototype.setEngineRevs = function(revs) {
    let minPitch = 0.5;
    let maxPitch = 3;
    const normalizedRevs = revs / 6000;
    let pitch = (normalizedRevs * (maxPitch - minPitch)) + minPitch;
    this.entity.sound.slot(this.engineType).pitch = pitch;
};

// Play engine stop sound
EngineAudioManager.prototype.stopEngineLoop = function() {
    this.entity.sound.slot(this.engineType).stop();
};

EngineAudioManager.prototype.onPause = function () {
    this.entity.sound.pause();
}

EngineAudioManager.prototype.onUnpause = function () {
    if (this.fxEnabled) {
        this.startEngineLoop();
    }
}

EngineAudioManager.prototype.switchVehicle = function (vehicleName) {
    let vehicle = this.app.game.vehicleData.vehicles.filter((data) => {return (data.key === vehicleName);});
    if (!vehicle.length) {
        throw Error(`Unknown vehicle: ${vehicleName}`);
    }
    this.setEngineType(vehicle[0].engine);
}

EngineAudioManager.prototype.toggleFx = function (value) {
    this.fxEnabled = value;
    if (this.fxEnabled) {
        this.onUnpause();
    } else {
        this.onPause();
    }
}
