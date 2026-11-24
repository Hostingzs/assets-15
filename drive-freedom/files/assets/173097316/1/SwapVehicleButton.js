let SwapVehicleButton = pc.createScript("SwapVehicleButton");

SwapVehicleButton.prototype.initialize = function () {

    // test for first enable
    this.onShow();
    // test for subsequent enables
    this.on("enable", () => {
        this.onShow();
    });
}

SwapVehicleButton.prototype.onShow = function () {
    this.entity.element.on("click", this.onClick, this);

    this.app.input.listen(InputAction.ACTIVATE, this.onClick, this);
}

SwapVehicleButton.prototype.onHide = function () {
    this.entity.element.off("click", this.onClick, this);
    this.app.input.unlisten(InputAction.ACTIVATE, this.onClick, this);
}

SwapVehicleButton.prototype.onClick = function (e) {
    this.app.fire("button:click:swapvehicle");
    this.onHide();
};
