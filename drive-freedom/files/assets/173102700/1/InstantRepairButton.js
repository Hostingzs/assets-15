let InstantRepairButton = pc.createScript("InstantRepairButton");

InstantRepairButton.prototype.initialize = function () {
    // test for first enable
    this.onShow();
    // test for subsequent enables
    this.on("enable", () => {
        this.onShow();
    });
}


InstantRepairButton.prototype.onShow = function () {
    this.entity.element.on("click", this.onClick, this);

    this.app.input.listen(InputAction.ACTIVATE, this.onClick, this);
}

InstantRepairButton.prototype.onHide = function () {
    this.entity.element.off("click", this.onClick, this);
    this.app.input.unlisten(InputAction.ACTIVATE, this.onClick, this);
}

InstantRepairButton.prototype.onClick = async function (e) {
    if (this.app.game.paused) return;

    this.onHide();

    let result = await this.app.poki.startRewardedBreak();
    if (result) {
        this.app.poki.trackEvent('gameplay', 'instantrepair', 'success');
        let healthNeeded = this.app.playerData.getMaxHealth() - this.app.playerData.getHealth();
        this.app.fire("vehicle:repair", healthNeeded);
        this.app.fire("ui:hidebutton", "repair");
    } else {
        this.app.poki.trackEvent('gameplay', 'instantrepair', 'fail');
    }
};
