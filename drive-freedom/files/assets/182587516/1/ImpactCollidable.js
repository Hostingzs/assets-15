let ImpactCollidable = pc.createScript("ImpactCollidable");

ImpactCollidable.prototype.initialize = function (other) {
    this.entity.rigidbody.on("collisionstart", this.onCollision, this);
    this.entity.on("ephemera:reset", this.reset, this);
    
    this.impulse = new pc.Vec3();

    this.reset();
}

ImpactCollidable.prototype.reset = function (ephemera) {
    this.entity.rigidbody.type = pc.BODYTYPE_KINEMATIC
    this.entity.rigidbody.linearVelocity = pc.Vec3.ZERO;
    this.entity.rigidbody.angularVelocity = pc.Vec3.ZERO;
}

ImpactCollidable.prototype.onCollision = function (result) {
    if (result.other.script && result.other.script.CarEntity) {
        // console.log("player collision");

        if (this.entity.rigidbody.type === pc.BODYTYPE_KINEMATIC) {
            this.entity.rigidbody.type = pc.BODYTYPE_DYNAMIC;

            let otherVel = result.other.rigidbody.linearVelocity;

            let otherMassRatio = result.other.rigidbody.mass / (this.entity.rigidbody.mass + result.other.rigidbody.mass);
            let massRatio = this.entity.rigidbody.mass / (this.entity.rigidbody.mass + result.other.rigidbody.mass);

            let desiredDeltaV = result.other.script.CarEntity.car.speed * otherMassRatio; // use this value as rigidbody will have been updated in the physics system
            // let desiredDeltaV = otherVel.length();// ;
            let impulse = desiredDeltaV * this.entity.rigidbody.mass;
            result.contacts.forEach((contact) => {
                this.impulse.copy(contact.normal).mulScalar(-impulse);
                this.entity.rigidbody.applyImpulse(this.impulse, contact.localPoint);
                result.other.rigidbody.applyImpulse(this.impulse, contact.localPointOther);
            });
            
    
        }
        // this.entity.rigidbody.linearFactor = pc.Vec3.ONE;
    }
}

