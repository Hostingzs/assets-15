let SplineTest = pc.createScript("SplineTest");

SplineTest.prototype.initialize = function () {
    // this.app.splineVisualizer = this;
    // this.v = new SplineVisualizer(this.app);

    // this.hspline = new HermiteSpline();
    // this.hspline.addPoint(new pc.Vec3(3,0,0), new pc.Vec3(0,1,0));
    // this.hspline.addPoint(new pc.Vec3(3,1,0), new pc.Vec3(1,0,0));
    // this.hspline.addPoint(new pc.Vec3(5,2,0), new pc.Vec3(0,-1,0));
    // this.hspline.addPoint(new pc.Vec3(5,0,0), new pc.Vec3(0,-1,0));

    // this.splines = [];

    // this.addSpline(this.hspline);

    // let camera = this.app.root.findByName("Camera");
    // this.editor = new SplineEditor(this.app, camera.camera);
    // this.editor.select(this.hspline);
};

SplineTest.prototype.addSpline = function (spline) {
    let d = spline.serialize()
    spline.deserialize(d);
    this.splines.push(spline);
}
SplineTest.prototype.update = function (dt) {

    // this.splines.forEach((spline, i) => {
    //     this.v.draw(spline, this.colors[i % this.colors.length]);
    // })
    // this.v.draw(this.crspline, );
    // this.v.draw(this.hspline, new pc.Color(0,1,0));
};




