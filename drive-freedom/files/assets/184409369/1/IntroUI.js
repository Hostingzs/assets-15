let IntroUi = pc.createScript("IntroUi");

IntroUi.prototype.initialize = function () {
    let playButton = this.entity.findByName("Play Button");

    playButton.button.on("click", (evt) => {
        this.app.poki.gameplayStart();
        this.onHide();
        evt.stopPropagation();
    });

    let content = this.entity.findByName("Content");
    let mobileContent = this.entity.findByName("Touch Content");

    if (pc.platform.mobile) {
        this.content = mobileContent;
    } else {
        this.content = content;
    }

    this.storage = new GameStorage("intro");
    this.storage.load();
    this.onShow();
    this.app.fire("game:disableinput");

    this.app.on("vehicle:died", () => {
        this.onHide();
    });
    
    this.app.on("vehicle:outoffuel", () => {
        this.onHide();
    });
}

IntroUi.prototype.update = function (dt) {
    if (this.app.input.wasPressed(InputAction.ACTIVATE)) {
        this.app.poki.gameplayStart();
        this.onHide();
    }

    if (this.app.input.wasPressed(InputAction.ACCELERATE)) {
        this.app.poki.gameplayStart();
        this.onHide();
    }

    if (this.app.input.wasPressed(InputAction.BRAKE)) {
        this.app.poki.gameplayStart();
        this.onHide();
    }

    if (this.app.input.wasPressed(InputAction.LEFT)) {
        this.app.poki.gameplayStart();
        this.onHide();
    }

    if (this.app.input.wasPressed(InputAction.RIGHT)) {
        this.app.poki.gameplayStart();
        this.onHide();
    }
}

IntroUi.prototype.onShow = function () {
    this.content.enabled = true;
}

IntroUi.prototype.onHide = function () {
    this.content.enabled = false;
    this.entity.enabled = false;
    this.storage.set("dismissed", true);
    this.storage.save();
    this.app.fire("game:enableinput");

}
