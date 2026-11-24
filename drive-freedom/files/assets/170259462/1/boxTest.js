// var BoxTest = pc.createScript("BoxTest");

// BoxTest.attributes.add("left", {type: "number", default: 10});
// BoxTest.attributes.add("right", {type: "number", default: 10});

// BoxTest.prototype.reset = function () {
//     this.entity.rigidbody.teleport(0,5,-5, 0,0,0);
    
//     this.entity.rigidbody.linearVelocity = pc.Vec3.ZERO;
//     this.entity.rigidbody.angularVelocity = pc.Vec3.ZERO;

// }
// BoxTest.prototype.update = function (dt) {
//     this.entity.rigidbody.applyForce(0, this.left, 0, 0, -5, -1);
//     this.entity.rigidbody.applyForce(0, this.right, 0, 0, -5, 1);

//     if (this.app.keyboard.wasPressed(pc.KEY_R)) {
//         this.reset();
//     }
// };