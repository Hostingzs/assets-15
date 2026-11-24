// var TestTrail = pc.createScript("TestTrail");

// TestTrail.attributes.add("texture", {type: "asset", assetType: "texture"});

// TestTrail.prototype.initialize = function () {
//     this.tm = new TrailManager(this.app, this.texture.resource, 6);
//     // this.tm.createEntity();
//     this.count = 0;
// }

// TestTrail.prototype.update = function (dt) {
//     if (this.app.keyboard.wasPressed(pc.KEY_S)) {
//         this.tm.stop();
//         this.count++
//     }

//     if (this.app.keyboard.wasPressed(pc.KEY_T)) {
//         let start = new pc.Vec3(this.count,1,0);
//         let end = new pc.Vec3(this.count,-20,0);
//         let result = this.app.systems.rigidbody.raycastFirst(start, end)

//         if (result) {
//             this.tm.update(0.5, result.point, result.normal);
//         }

//         this.count++;
//         if (this.count > 15) {
//             this.count = 0;
//             this.tm.stop();
//         }
//     }
// }
