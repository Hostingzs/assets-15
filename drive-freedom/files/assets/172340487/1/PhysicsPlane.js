let PhysicsPlane = pc.createScript("PhysicsPlane");

PhysicsPlane.prototype.initialize = function () {
    this.reset();
}

PhysicsPlane.prototype.reset = function () {
    let pos = this.entity.getPosition();
    let scale = this.entity.getLocalScale();

    const MAX_BOX_SIZE = 10;
    const w = scale.x;
    const d = scale.z;
    const hw = w / 2;
    const hd = d / 2;

    let numBoxesWide = Math.ceil(w / MAX_BOX_SIZE);
    let numBoxesDeep = Math.ceil(d / MAX_BOX_SIZE);
    let lastBoxWidth = w % MAX_BOX_SIZE || MAX_BOX_SIZE;
    let lastBoxDepth = d % MAX_BOX_SIZE || MAX_BOX_SIZE;

    for (let x = 0; x < numBoxesWide; x++) {
        for (let z = 0; z < numBoxesDeep; z++) {
            let boxWidth = x === numBoxesWide - 1 ? lastBoxWidth : MAX_BOX_SIZE;
            let boxDepth = z === numBoxesDeep - 1 ? lastBoxDepth : MAX_BOX_SIZE;
            
            // Create and position your box here
            // Example: createBox(boxWidth, boxDepth, positionX, positionZ);

            let positionX = x * MAX_BOX_SIZE + boxWidth / 2;
            let positionZ = z * MAX_BOX_SIZE + boxDepth / 2;

            let e = new pc.Entity();
            e.addComponent("rigidbody");
            e.addComponent("collision");

            e.collision.halfExtents = e.collision.halfExtents.set(boxWidth / 2, 1, boxDepth / 2);
            e.collision.linearOffset = e.collision.linearOffset.set(0, -1, 0);
            e.setLocalPosition((-hw + positionX) / scale.x, 0, (-hd + positionZ) / scale.z);

            this.entity.addChild(e);
        }
    }    
}