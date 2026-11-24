let FenceManager = pc.createScript("FenceManager");


FenceManager.attributes.add("particle", {type: "entity"});

FenceManager.prototype.initialize = function () {
    let fences = this.findAllFences();

    let trigger = this.app.assets.find("Fence Trigger", "template");

    fences.forEach((fence) => {
        let triggerInstance = trigger.resource.instantiate();
        fence.addChild(triggerInstance);

        fence.addComponent("script", {});
        fence.script.create("Destructible", {
            attributes: {
                particle: this.particle
            }
        });

        // triggerInstance.collision.on("triggerenter", (event) => {
        //     console.log("Trigger", event);
        // });
    })

};

FenceManager.prototype.findAllFences = function () {
    let fences = [];

    let recurse = function (parent, output) {
        parent.children.forEach((c) => {
            if (c.name.indexOf("Fence") >= 0) {
                output.push(c);
            } else {
                recurse(c, output);
            }
        });
    };

    recurse(this.app.root, fences);

    return fences;
};

FenceManager.prototype.update = function (dt) {

};