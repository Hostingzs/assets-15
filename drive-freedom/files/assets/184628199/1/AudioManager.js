var AudioManager = pc.createScript('AudioManager');

// Initialize the script
AudioManager.prototype.initialize = function() {
    this.fxEnabled = true;

    this.app.on("audio:collision", this.onCollision, this);
    this.app.on("audio:collect-coin", this.onCollectCoin, this);
    this.app.on("audio:destructiblehit", this.onDestructibleHit, this);

    this.app.on("game:pause", this.onPause, this);
    this.app.on("game:unpause", this.onUnpause, this);

    this.app.on("audio:toggleFx", this.toggleFx, this);

};


AudioManager.prototype.postInitialize = function () {
    // update from stored data
    this.fxEnabled = this.app.game.isFxEnabled();

}

AudioManager.prototype.update = function(dt) {
    // if (this.app.keyboard.wasPressed(pc.KEY_K)) {
    //     if (this.app.systems.sound.volume == 0) {
    //         this.app.systems.sound.volume = 1;
    //     } else {

    //         this.app.systems.sound.volume = 0;
    //     }
    // }  
};

AudioManager.prototype.onCollision = function (totalImpulse) {
    if (!this.fxEnabled) return;
    let slots = ["impact-1", "impact-2", "impact-3", "impact-4"];
    let randomIndex = Math.floor(pc.math.random(0, slots.length));
    
    let maxPitch = 1.0;
    let minPitch = 0.75;
    let pitch = pc.math.random(minPitch, maxPitch);
    this.entity.sound.slot(slots[randomIndex]).pitch = pitch;
    this.entity.sound.slot(slots[randomIndex]).play();
}

AudioManager.prototype.onCollectCoin = function () {
    if (!this.fxEnabled) return;
    this.entity.sound.slot("coin-collect").play();
}

AudioManager.prototype.onPause = function () {
    this.entity.sound.pause();
}

AudioManager.prototype.onUnpause = function () {
    if (this.fxEnabled) {
        this.entity.sound.resume();
    }
}

AudioManager.prototype.onDestructibleHit = function () {
    if (!this.fxEnabled) return;
    this.onCollision(1000);
}

AudioManager.prototype.toggleFx = function (value) {
    this.fxEnabled = value;
    if (this.fxEnabled) {
        this.onUnpause();
    } else {
        this.onPause();
    }
}
