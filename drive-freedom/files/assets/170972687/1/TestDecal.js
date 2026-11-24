// var TestDecal = pc.createScript("TestDecal");

// TestDecal.attributes.add("texture", {type: "asset"});

// TestDecal.prototype.initialize = function () {
//     this.dm = new DecalManager(this.app, this.texture.resource, 32);
//     this.dm.createEntity();
//     this.count = 0;
// }

// TestDecal.prototype.update = function (dt) {
//     if (this.app.keyboard.wasPressed(pc.KEY_T)) {
//         let start = new pc.Vec3(this.count,1,0);
//         let end = new pc.Vec3(this.count,-20,0);
//         let result = this.app.systems.rigidbody.raycastFirst(start, end)

//         if (result) {
//             this.dm.createDecal(0.1, result.point, result.normal);
//         }

//         this.count++;
//     }
// }
