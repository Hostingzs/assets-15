let VehicleDetailsPanel  = pc.createScript("VehicleDetailsPanel");

VehicleDetailsPanel.attributes.add("nameEl", {type: "entity"});
VehicleDetailsPanel.attributes.add("speedEl", {type: "entity"});
VehicleDetailsPanel.attributes.add("accelEl", {type: "entity"});
VehicleDetailsPanel.attributes.add("suspensionEl", {type: "entity"});
VehicleDetailsPanel.attributes.add("toughnessEl", {type: "entity"});

VehicleDetailsPanel.prototype.initialize = function() {
    this.app.on("ui:store:selected", (item) => {
        this.nameEl.element.text = item.name;
        this.setPoints(this.speedEl, item.speed);
        this.setPoints(this.accelEl, item.accel);
        this.setPoints(this.suspensionEl, item.suspension);
        this.setPoints(this.toughnessEl, item.toughness);
    });
};

VehicleDetailsPanel.prototype.setPoints = function(element, points) {
    let children = element.getChildren();
    for(let i = 0; i < children.length; i++) {
        if (points - 1 >= i) {
            children[i].enabled = true;
        } else {
            children[i].enabled = false;
        }
    }
};