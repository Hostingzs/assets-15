let CollectibleStrip = pc.createScript("CollectibleStrip");

CollectibleStrip.attributes.add("splineAsset", {type:"asset", assetType:"json"});
CollectibleStrip.attributes.add("collectible", {type:"asset", assetType:"template"});
CollectibleStrip.attributes.add("count", {type: "number", step: 1, precision: 0}); 

CollectibleStrip.prototype.initialize = function () {
    this.spline = new HermiteSpline();
    this.points = [];
    this.collectibles = [];
    this.load();
    this.updatePoints();
    this.spawn();

    this.on("attr:count", (value, prev) => {
        this.clear();
        this.updatePoints();
        this.spawn();
    });

    this.on("attr:collectible", (value, prev) => {
        this.clear();
        this.updatePoints();
        this.spawn();
    });
};

CollectibleStrip.prototype.clear = function () {
    this.points.length = 0;

    this.collectibles.forEach((e) => {
        e.destroy();
    });
    this.collectibles.length = 0;
}

CollectibleStrip.prototype.load = function () {
    let data = this.splineAsset.resource;
    this.spline.deserialize(data);

    let camera = this.app.root.findByName("Camera");
    this.editor = new SplineEditor(this.app, camera.camera);
    this.editor.select(this.spline);

};

CollectibleStrip.prototype.updatePoints = function () {
    let it = new SplineIterator();
    it.setSpline(this.spline);
    if (this.count > 1) {
        let d = 0;
        let len = this.spline.length()
        let step = len / (this.count - 1);
        let limit = len+step; // account for floating point accuracy
        while (d <= limit) {
            let p = new pc.Vec3();
            it.getPoint(p);
            this.points.push(p);

            it.move(step);
            d += step;
        }
    } else if (this.count === 1) {
        let p = new pc.Vec3();
        this.points.push(this.spline.getPointAt(0.5, p));
    }

    // if (this.count > 1) {
    //     let t = 0;
    //     let step = 1 / (this.count - 1);
    //     while (t <= 1) {
    //         let p = new pc.Vec3();
    //         this.points.push(this.spline.getPointAt(t, p));
    //         t += step;
    //     }    
    // }
}

CollectibleStrip.prototype.spawn = function () {
    this.points.forEach((p) => {
        let e = this.collectible.resource.instantiate()
        this.entity.addChild(e);
        this.collectibles.push(e);
        e.setPosition(p);
    });
};

CollectibleStrip.prototype.update = function (dt) {

};