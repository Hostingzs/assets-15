let DebugDisplay = pc.createScript("DebugDisplay");


DebugDisplay.prototype.initialize = function () {
    this.app.on("debug:display", (name, value) => {
        let el = this.entity.findByName(name);
        if (el) {
            el.element.text = `${name}: ${value}`;
        }
    });
}