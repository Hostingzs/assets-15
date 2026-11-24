let MusicDisplay = pc.createScript("MusicDisplay");

MusicDisplay.prototype.initialize = function () {
    this.app.on("audio:musicchange", this.onMusicChange, this);

    this.X_ON = -5;
    this.X_OFF = 250;
    this.x = this.X_OFF;
    this.pos = new pc.Vec3();
    //this.slideOn();
};

MusicDisplay.prototype.slideOn = function () {
    this.entity.tween(this.entity.getLocalPosition()).to({x: this.X_OFF}, 0.1, pc.SineInOut).start().onComplete(() => {
        this.entity.tween(this.entity.getLocalPosition()).to({x: this.X_ON}, 1.0, pc.SineInOut).start().onComplete(() => {
            this.slideOff();
        });    
    });
}

MusicDisplay.prototype.slideOff = function () {
    this.entity.tween(this.entity.getLocalPosition()).to({x: this.X_OFF}, 1.0, pc.SineInOut).delay(2).start();
}

MusicDisplay.prototype.slideOffInstant = function () {
}

MusicDisplay.prototype.onMusicChange = function (trackName, artistName) {
    this.slideOn();
    this.entity.findByName("Song Name").element.text = trackName;
}