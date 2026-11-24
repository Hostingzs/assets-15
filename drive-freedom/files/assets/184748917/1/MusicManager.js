var MusicManager = pc.createScript('MusicManager');

const ARTIST_NAME = "Kevin MacLeod";

// Initialize the script
MusicManager.prototype.initialize = function() {
    this.musicEnabled = true;

    this.assets = this.app.assets.findByTag("music");
    this.numTracks = this.assets.length;
    this.track = 4;

    this.app.on("game:pause", this.onPause, this);
    this.app.on("game:unpause", this.onUnpause, this);
    this.app.on("audio:nextTrack", this.skip, this);
    this.app.on("audio:toggleMusic", this.toggleMusic, this);

    this.app.on("ui:button:click:skiptrack", this.skip, this);
};

MusicManager.prototype.postInitialize = function () {
    // update from stored data
    this.musicEnabled = this.app.game.isMusicEnabled();
    if (this.musicEnabled) {
        this.play("Cloud Dancer");
    } else {
        this.stopMusic();
    }
}

MusicManager.prototype.skip = function () {
    this.entity.sound.slot("Slot 1").stop();
    this.track++;
    if (this.track >= this.numTracks) {
        this.track = 0;
    }
    this.play();
}

MusicManager.prototype.play = function(name) {
    if (!this.musicEnabled) return;
    if (name) {
        this.track = this.assets.findIndex((a) => a.name === name);
    }

    this.app.fire("audio:musicchange", this.assets[this.track].name, ARTIST_NAME);
    this.entity.sound.slot("Slot 1").asset = this.assets[this.track];
    this.entity.sound.slot("Slot 1").play();
};

MusicManager.prototype.stopMusic = function() {
    this.entity.sound.stop();
};


MusicManager.prototype.onPause = function () {
    this.entity.sound.pause();
}

MusicManager.prototype.onUnpause = function () {
    this.entity.sound.resume();
}

MusicManager.prototype.toggleMusic = function (value) {
    this.musicEnabled = value;
    if (!this.musicEnabled) {
        this.stopMusic();
    } else {
        this.play();
    }
}