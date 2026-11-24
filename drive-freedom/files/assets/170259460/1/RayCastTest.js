let RayCastTest = pc.createScript("RayCastTest");


RayCastTest.attributes.add("y", {type:"number"});
RayCastTest.attributes.add("len", {type:"number"});
RayCastTest.attributes.add("point", {type:"entity"});

RayCastTest.prototype.update = function (dt) {

    
    // jitter position
    
    let p = this.entity.getPosition();
    p.x = 0 + pc.math.random(-0.02, 0.02);
    p.y = 3 + pc.math.random(-0.02, 0.02);
    p.z = -4 + pc.math.random(-0.02, 0.02);
    this.entity.setPosition(p);

    let ray = this.entity.up.clone().mulScalar(this.len);

    let start = this.entity.getPosition();
    let end = start.clone().add(ray).mulScalar(-1);

    let result = this.app.systems.rigidbody.raycastFirst(start, end);
    if (result) {
        this.point.setPosition(result.point);
        end.copy(result.point).add(result.normal);
        this.point.lookAt(end, this.entity.right);
        console.log(`${result.point.y}`);
    }
}