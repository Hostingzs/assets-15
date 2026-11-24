let ActivateMissionPrompt = pc.createScript("ActivateMissionPrompt");

ActivateMissionPrompt.attributes.add("countdown", {type: "entity"});

ActivateMissionPrompt.prototype.initialize = function () {
    this.entity.element.on("click", this.onClick, this);

    this.countdownTimer = 5;
    this.countdownDigit = 5;
    // test for first enable
    this.onShow();
    // test for subsequent enables
    this.on("enable", () => {
        this.onShow();
    });

    this.on("disable", () => {
        this.onHide();
    });
}

ActivateMissionPrompt.prototype.update = function (dt) {
    this.countdownTimer -= dt;
    if (this.countdownTimer < 0) {
        this.onClick();
        return;
    }

    let digit = Math.ceil(this.countdownTimer);
    if (digit !== this.countdownDigit) {
        this.countdownDigit = digit;
        this.countdown.element.text = digit.toFixed(0);
    }
}

ActivateMissionPrompt.prototype.onShow = function () {
    this.app.input.listen(InputAction.ACTIVATE, this.onClick, this);
    let idx = this.app.missionManager.missionToBeActivated;
    let mission = this.app.missionManager.missions[idx];
    let e = this.entity.findByName("Mission Name");
    if (e && mission) {
        e.element.key = mission.name;
    }

    this.countdownTimer = 5;
    this.countdownDigit = 5;
    this.countdown.element.text = "5";
};

ActivateMissionPrompt.prototype.onHide = function () {
    this.app.input.unlisten(InputAction.ACTIVATE, this.onClick, this);
};


ActivateMissionPrompt.prototype.onClick = function (e) {
    if (this.app.game.paused) return;

    this.app.fire("mission:triggerStart");
};


