let MenuUi = pc.createScript("MenuUi");

MenuUi.attributes.add("musicToggle", {type: "entity"});
MenuUi.attributes.add("fxToggle", {type: "entity"});
// MenuUi.attributes.add("Music Toggle", {type: "entity"});

MenuUi.prototype.initialize = function () {
    this.musicEnabled = true;
    this.fxEnabled = true;
    this.creditsScreen = this.app.root.findByName("Credits Screen");

    this.app.on("ui:button:click:option:music", this.onToggleMusic, this);
    this.app.on("ui:button:click:option:sound", this.onToggleSound, this);
    this.app.on("ui:button:click:option:credits", this.onToggleCredits, this);

    this.on("enable", () => {
        this.onShow();
    });
    this.on("disable", () => {
        this.onHide();
    });

    this.onShow();
};

MenuUi.prototype.onToggleMusic = function () {
    if (this.app.game.adPlaying) return;
    this.musicEnabled = !this.musicEnabled;
    this.musicToggle.element.text = this.musicEnabled ? "On" : "Off";
    this.app.game.setMusicEnabled(this.musicEnabled);
    this.app.fire("audio:toggleMusic", this.musicEnabled);
};

MenuUi.prototype.onToggleSound = function () {
    if (this.app.game.adPlaying) return;
    this.fxEnabled = !this.fxEnabled;
    this.fxToggle.element.text = this.fxEnabled ? "On" : "Off";
    this.app.game.setFxEnabled(this.fxEnabled);
    this.app.fire("audio:toggleFx", this.fxEnabled);
};

MenuUi.prototype.onToggleCredits = function () {
    if (this.app.game.adPlaying) return;
    this.creditsScreen.enabled = !this.creditsScreen.enabled;
    this.entity.enabled = false;
}

MenuUi.prototype.onHide = function () {
    // this.app.game.maybeShowCommercialBreak();
}

MenuUi.prototype.onShow = function () {
    this.musicEnabled = this.app.game.isMusicEnabled();
    this.fxEnabled = this.app.game.isFxEnabled();
    this.musicToggle.element.text = this.musicEnabled ? "On" : "Off";
    this.fxToggle.element.text = this.fxEnabled ? "On" : "Off";
}
