// car model with modeled wheels
const EPSILON = 0.01;
const LARGE_EPSILON = 0.1;
let USE_NEW_SUS = false;

let biggestSA = 0;

class WheeledCar
{
    constructor(entity, body, system, params) {
        this.entity = entity; // car entity
        this.body = body; // rigidbody
        this.system = system; // rigidbody system
        
        // inputs:
        this.accelerating = 0; // 1 = accel, 0 = idle, -1 = braking
        this.turning = 0; // 1 = right, 0 = idle, -1 = left
        this.handbrake = false;
        this.drifting = false; // drift mode on
        this.turnSpeed = 0.6;
        this.wheelAngle = 0;
        this.groundNormal = new pc.Vec3();
        this.groundPosition = new pc.Vec3();
        this.totalLateralForce = new pc.Vec3(); // sum lateral force from wheels, used in roll animation
        this.speedRatio = 0; // latSpeed / (latSpeed + longSpeed) - 0 means motion is fully forward, 1 means motion is fully sideways
        
        this.airTimer = 0; // time in air

        params = params || {};
        this.TOP_SPEED = params.TOP_SPEED;
        this.ACCEL = params.ACCEL;
        this.BRAKE = params.BRAKE;
        this.DRAG_COEFF = params.DRAG_COEFF;
        this.RR_COEFF = params.RR_COEFF;
        this.WHEEL_ANGLE_MAX = params.WHEEL_ANGLE_MAX; // 0 is nothing, 1 is 90 deg
        this.TURN_SPEED = params.TURN_SPEED; // rate that wheel angle increases
        this.ROLL_INFLUENCE = params.ROLL_INFLUENCE; // 0 is no roll; 1 is physically correct roll
        
        this.ACCEL_CURVE = params.ACCEL_CURVE;
        this.GRIP_CURVE = params.GRIP_CURVE;
        
        this.DRIFT_YAW_FORCE = params.DRIFT_YAW_FORCE;
        this.DRIFT_MODE_MIN_SPEED = params.DRIFT_MODE_MIN_SPEED;
        this.DRIFT_MODE_DISABLE_SPEED = params.DRIFT_MODE_DISABLE_SPEED;

        this.AIR_PITCH_FORCE = params.AIR_PITCH_FORCE;
        this.AIR_YAW_FORCE = params.AIR_YAW_FORCE;
        this.AIR_ROLL_FORCE = params.AIR_YAW_FORCE;
    
        // forces
        this.force = new pc.Vec3();
        this.traction = new pc.Vec3();
        this.drag = new pc.Vec3();
        this.rollingResistance = new pc.Vec3();
        this.brakingForce = new pc.Vec3();
        this.dragForce = new pc.Vec3();
        this.airForce = new pc.Vec3();

        this.tmp = new pc.Vec3(); // tmp vector for calculations
        this.tmp2 = new pc.Vec3(); // tmp for calculations
        
        // common variables per frame
        this.dt = 0;
        this.forward = new pc.Vec3();
        this.right = new pc.Vec3();
        this.up = new pc.Vec3();
        this.direction = new pc.Vec3();
        this.speed = 0;
        this.longSpeed = 0;
        this.parallelVel = new pc.Vec3(); // ground parallel component of velocity
        this.topSpeed = this.TOP_SPEED;
        this.topSpeedFactor = 1;
        this.numWheelsOnGround = 4;
        
        // create wheels
        this.wheels = [];
        let numPoweredWheels = 0;
        params.POWERED_WHEELS.forEach((val) => { val ? numPoweredWheels++ : numPoweredWheels});
        for (let i = 0; i < 4; i++) {
            this.wheels.push(new Wheel(
                this.body,
                this.system, // rigidbody system
                {
                    canTurn: i < 2,
                    powered: params.POWERED_WHEELS[i],
                    offset: params.OFFSETS[i],
                    mass: this.body.mass,
                    WHEEL_RADIUS: params.WHEEL_RADIUS[i],
                    ACCEL: params.ACCEL,
                    ACCEL_CURVE: params.ACCEL_CURVE,
                    BRAKE: params.BRAKE,
                    GRIP: params.GRIP[i],
                    GRIP_CURVE: this.GRIP_CURVE,
                    CORNERING_STIFFNESS: params.CORNERING_STIFFNESS,
                    SUSPENSION_STIFFNESS: params.SUSPENSION_STIFFNESS,
                    SUSPENSION_COMPRESSION_FACTOR: params.SUSPENSION_COMPRESSION_FACTOR,
                    SUSPENSION_EXPANSION_FACTOR: params.SUSPENSION_EXPANSION_FACTOR,
                    SUSPENSION_REST_LENGTH: params.SUSPENSION_REST_LENGTH,
                    SUSPENSION_MAX_LENGTH: params.SUSPENSION_MAX_LENGTH,
                    SUSPENSION_MIN_LENGTH: params.SUSPENSION_MIN_LENGTH,
                    HANDBRAKE_GRIP_FACTOR: params.HANDBRAKE_GRIP_FACTOR,
                    DRIFT_MODE_GRIP_FACTOR: params.DRIFT_MODE_GRIP_FACTOR
                }
            ));
            this.wheels[i].updateFromCar(this);
        }
    }   

    reset(position, forward)
    {
        let y = 0;
        if (forward) {
            y = Math.atan2(forward.z, forward.x) * pc.math.RAD_TO_DEG;
        }
        this.body.teleport(position.x, position.y, position.z, 0,y,0);
        this.body.linearVelocity = pc.Vec3.ZERO;
        this.body.angularVelocity = pc.Vec3.ZERO;
    }


    startFrame()
    {
        // initialize data before input is checked
        this.accelerating = 0;
        this.turning = 0;
        this.handbrake = false;
    }

    update(dt)
    {   
        this.dt = dt;
        this.calculateCommon();

        if (!this.onGround()) {
            this.airTimer += dt;
        } else {
            this.airTimer = 0;
        }

        // speeds in m/s
        const MIN_WHEEL_MAX_SPEED = 5;
        const MAX_WHEEL_MAX_SPEED = 30;

        // update wheel angle based on turn speed and player input
        let wheelAngleMaxFactor = 1;
        if (this.speed > MIN_WHEEL_MAX_SPEED) {
            wheelAngleMaxFactor = Math.max(0.25, 1 - (this.speed - MIN_WHEEL_MAX_SPEED) / (MAX_WHEEL_MAX_SPEED - MIN_WHEEL_MAX_SPEED) * (1 - 0.25));
        }
        let wheelAngleMaxRad = this.WHEEL_ANGLE_MAX * pc.math.DEG_TO_RAD * wheelAngleMaxFactor;
        let targetWheelAngle = this.turning * wheelAngleMaxRad; // between -90 and 90 (but in rads, so -PI/2 -> +PI/2)
        let dir = targetWheelAngle >= this.wheelAngle ? 1 : -1;
        let turnSpeedRad = this.TURN_SPEED * pc.math.DEG_TO_RAD;
        if (this.turning === 0) {
            turnSpeedRad *= 10; // fast return to neutral
        }
        if (this.wheelAngle > 0 && this.turning < 0 || this.wheelAngle < 0 && this.turning > 0) {
            turnSpeedRad *= 10;
        }
        this.wheelAngle += (dir * turnSpeedRad * dt);

        // clamp to target
        if (dir > 0 && (this.wheelAngle > targetWheelAngle)) {
            this.wheelAngle = Math.min(targetWheelAngle, this.wheelAngle);
        } else if (dir < 0 && (this.wheelAngle < targetWheelAngle)) {
            this.wheelAngle = Math.max(targetWheelAngle, this.wheelAngle);
        }

        // Calculate suspension forces
        for (let i = 0; i < 4; i++) {
            this.wheels[i].preUpdate(dt, this, this.wheelAngle);
        }

        let totalWheelLoad = 0;
        // calculate the wheel loads from all the suspension forces
        for (let i = 0; i < 4; i++) {
            if (this.wheels[i].wheelLoad > 0) {
                totalWheelLoad += this.wheels[i].wheelLoad;
            }
        }
        // then calculate driving and turning forces using wheel load
        for (let i = 0; i < 4; i++) {
            this.wheels[i].postUpdate(totalWheelLoad);
        }
        
        let offset = this.tmp;
        let modify = this.tmp2;

        
        for (let i = 0; i < 4; i++) {
            offset.copy(this.wheels[i].contactPoint).sub(this.entity.getPosition());
            this.body.applyForce(this.wheels[i].brakingForce, offset);
            this.body.applyForce(this.wheels[i].traction, offset);
            
            offset.copy(this.wheels[i].contactPoint).sub(this.entity.getPosition());
            this.body.applyForce(this.wheels[i].suspensionForce, offset);

            // ROLL_INFLUENCE
            // 0 - no roll
            // 1 - full roll            
            let proj = -this.wheels[i].up.dot(offset);
            modify.copy(this.wheels[i].up).mulScalar(proj * (1 - this.ROLL_INFLUENCE));
            offset.add(modify);
            
            this.body.applyForce(this.wheels[i].lateralForce, offset);
            this.totalLateralForce.add(this.wheels[i].lateralForce);
        }

        this.calculateFriction();
        this.body.applyForce(this.force.mulScalar(dt));

        this.calculateAndApplyAirForce();
        this.calculateAndApplyDriftingForce();

        // this.entity._app.fire("debug:display", "debug:accelForce", this.wheels[2].traction.length());
        // this.entity._app.fire("debug:display", "debug:frontSlipAngle", this.wheels[0].slipAngle * pc.math.RAD_TO_DEG);
    }
    
    sidePush (dir) {
        let impulse = this.tmp.copy(this.up).mulScalar(dir * 100000);
        this.body.applyImpulse(impulse);
        this.pushed = true;
    }

    calculateCommon()
    {
        // direction of travel - used by drag
        this.direction.copy(this.body.linearVelocity);
        this.direction.normalize();

        // update orientation
        this.forward.copy(this.entity.forward);
        this.right.copy(this.entity.right);
        this.up.copy(this.entity.up);
        
        // reset forces
        this.force.set(0,0,0);
        this.traction.set(0,0,0);
        this.drag.set(0,0,0);
        this.rollingResistance.set(0,0,0);
        this.brakingForce.set(0,0,0);
        this.dragForce.set(0,0,0);
        this.totalLateralForce.set(0,0,0);
 
        this.parallelVel.sub2(this.body.linearVelocity, this.parallelVel.copy(this.groundNormal).mulScalar(this.body.linearVelocity.dot(this.groundNormal)));

        this.topSpeed = this.TOP_SPEED * this.topSpeedFactor;
        this.speed = this.body.linearVelocity.length();
        this.longSpeed = this.body.linearVelocity.dot(this.forward);
        this.latSpeed = this.body.linearVelocity.dot(this.right);

        let denom  = this.latSpeed + this.longSpeed;
        if (denom !== 0) {
            this.speedRatio = this.latSpeed / denom;
            this.speedRatio = pc.math.clamp(this.speedRatio, -1, 1);    
        } else {
            this.speedRatio = 0;
        }

        // if (Math.abs(ratio) > )
        // enable drifting when hand brake is pressed at speed
        let isTurning = Math.abs(this.turning) > 0;
        if (this.handbrake && isTurning && this.longSpeed > this.DRIFT_MODE_MIN_SPEED) {
            // this.drifting = true;
        }

        // disable drifting when lateral speed gets low    
        if (!isTurning) {
            // if (this.drifting) {
            //     console.log("exiting drifting because no turn input");
            // }
            this.drifting = false;
            
        }

        if (Math.abs(this.latSpeed) < this.DRIFT_MODE_DISABLE_SPEED) {
            // if (this.drifting) {
            //     console.log("exiting drifting because lateral speed is low");
            // }
            this.drifting = false;
            
        }
        
        
    }

    calculateFriction() 
    {
        if (this.dt === 0) return;

        if (!this.accelerating && !this.turning && this.speed < LARGE_EPSILON) {
            this.body.linearVelocity = pc.Vec3.ZERO;
            this.body.angularVelocity = pc.Vec3.ZERO;
            return;
        }
        
        let speedSq = this.speed*this.speed;

        this.drag.copy(this.direction).mulScalar(-1 * speedSq * this.DRAG_COEFF);

        let rrFactor = (!this.accelerating && this.onGround()) ? -1 : 0;
        this.rollingResistance.copy(this.parallelVel).mulScalar(rrFactor * this.RR_COEFF);
        

        this.dragForce.add(this.drag);
        this.dragForce.add(this.rollingResistance);

        // friction clamp
        let maxForceMag = Math.abs(this.body.mass * this.longSpeed / this.dt);
        if (this.dragForce.length() > maxForceMag) {
            this.dragForce.normalize().mulScalar(maxForceMag);
        }

        this.force.add(this.dragForce);        
    }

    // allow player to control the car in the air
    calculateAndApplyAirForce () {
        // let AIR_PITCH_FORCE = 10000;
        // let AIR_YAW_FORCE = 10000;
        // let AIR_ROLL_FORCE = 5000;
        this.force.copy(this.up)

        if (!this.onGround()) {
            // don't apply air turning force at the start of the jump
            if (this.airTimer < 0.5) {return;}

            let pitch = -this.accelerating * this.AIR_PITCH_FORCE;
            let roll = this.turning * this.AIR_ROLL_FORCE / 2;
            let yaw = -this.turning * this.AIR_YAW_FORCE;

            this.force.mulScalar(pitch);
            this.body.applyForce(this.force, this.forward);
            
            // only apply roll force if we're not upright
            if (this.up.dot(pc.Vec3.UP) < 0.707) {
                this.force.copy(this.up).mulScalar(roll);
                this.body.applyForce(this.force, this.right);            
            }

            this.force.copy(this.right).mulScalar(yaw);
            this.body.applyForce(this.force, this.forward);
        }
    }

    calculateAndApplyDriftingForce () {
        if (this.onGround() && !this.handbrake) {
            let driftYawForce = this.DRIFT_YAW_FORCE * Math.abs(this.speedRatio);
            let yaw = -this.turning * driftYawForce;
            this.force.copy(this.right).mulScalar(yaw);
            this.body.applyForce(this.force, this.forward);                
        }
    }

    // any wheel is on the ground
    onGround() {
        let num = this.wheels.length;
        this.numWheelsOnGround = 0;
        for (let i = 0; i < num; i++) {
            if (this.wheels[i].onGround) {
                this.numWheelsOnGround++;
            }
        }
        return this.numWheelsOnGround > 0;
    }

    // limit top speed
    setTopSpeedFactor(factor) {
        this.topSpeedFactor = factor;
    }
}

class Wheel
{
    constructor(body, system, params)
    {
        this.body = body;
        this.system = system; // rigidbody system

        // this.WHEEL_RADIUS = 0.3;
        // this.body = body;
        // this.system = system;
        this.position = new pc.Vec3();
        this.attachPoint = new pc.Vec3();
        this.contactPoint = new pc.Vec3();

        this.groundValid = false;
        this.groundPosition = new pc.Vec3();
        this.groundNormal = new pc.Vec3();
        this.groundOffset = new pc.Vec3(); // vector from ground to attachpoint

        this.start = new pc.Vec3(); // raycast start
        this.end = new pc.Vec3(); // raycast end

        this.tmp = new pc.Vec3(); // temp vec for calculations
        this.quat = new pc.Quat(); // temp quat for calculations

        // inputs
        this.accelerating = 0;
        this.turning = 0;
        this.wasAccelerating = 0; // last frame's input

        // orientation
        this.forward = new pc.Vec3();
        this.right = new pc.Vec3();
        this.up = new pc.Vec3();

        // velocities
        this.velocity = new pc.Vec3();
        this.longVel = new pc.Vec3();
        this.latVel = new pc.Vec3();
        this.parallelVel = new pc.Vec3();
        this.angVelocity = new pc.Vec3();

        // forces
        this.force = new pc.Vec3(); // total force this frame
        this.lateralForce = new pc.Vec3(); // lateral force this frame
        this.traction = new pc.Vec3(); // force from engine
        this.brakingForce = new pc.Vec3(); // force from brakes
        this.suspensionForce = new pc.Vec3() // from suspension springs

        this.wheelLoad = 0; // "up" magnitude of suspension force 
        this.wheelLoadFactor = 0; // fraction compared to total wheel load on vehicle
        this.wheelAngle = 0;
        this.slipAngle = 0;
        this.speed = 0;
        this.longSpeed = 0;
        this.latSpeed = 0;
        this.skidding = false; // wheel is moving sideways or handbrake applied
        this.spinning = false; // wheel is spinning faster than it is moving forward
        this.grip = 1; // current value of grip

        // configurable params
        this.canTurn = params.canTurn;
        this.powered = params.powered;
        this.radius = params.WHEEL_RADIUS;
        this.offset = params.offset;
        this.mass = params.mass;
        //this.TOP_SPEED = params.TOP_SPEED;
        this.ACCEL = params.ACCEL;
        this.ACCEL_CURVE = params.ACCEL_CURVE;
        this.BRAKE = params.BRAKE; 
        this.CORNERING_STIFFNESS = params.CORNERING_STIFFNESS;
        this.GRIP = params.GRIP;
        this.GRIP_CURVE = params.GRIP_CURVE;
        this.HANDBRAKE_GRIP_FACTOR = params.HANDBRAKE_GRIP_FACTOR;
        this.DRIFT_MODE_GRIP_FACTOR = params.DRIFT_MODE_GRIP_FACTOR;

        this.SUSPENSION_REST_LENGTH = params.SUSPENSION_REST_LENGTH;
        this.SUSPENSION_MAX_LENGTH = params.SUSPENSION_MAX_LENGTH;
        this.SUSPENSION_MIN_LENGTH = params.SUSPENSION_MIN_LENGTH;
        this.SUSPENSION_STIFFNESS = params.SUSPENSION_STIFFNESS;
        this.CRITICAL_DAMPING = 2 * Math.sqrt(this.SUSPENSION_STIFFNESS * this.mass / 4);
        this.SUSPENSION_COMPRESSION_FACTOR = params.SUSPENSION_COMPRESSION_FACTOR;
        this.SUSPENSION_EXPANSION_FACTOR = params.SUSPENSION_EXPANSION_FACTOR;
        this.SUSPENSION_COMPRESSION_DAMPING = this.SUSPENSION_COMPRESSION_FACTOR * this.CRITICAL_DAMPING;
        this.SUSPENSION_EXPANSION_DAMPING = this.SUSPENSION_EXPANSION_FACTOR * this.CRITICAL_DAMPING;


        this.suspensionLength = this.SUSPENSION_REST_LENGTH;
        this.prevSuspensionLength = this.suspensionLength;
    }

    updateFromCar(car)
    {
        // update position
        this.forward.copy(car.forward);
        this.right.copy(car.right);
        this.up.copy(car.up);

        
        this.attachPoint.copy(car.entity.getPosition());
        this.tmp.copy(this.right).mulScalar(this.offset.x);
        this.attachPoint.add(this.tmp);
        this.tmp.copy(this.up).mulScalar(this.offset.y);
        this.attachPoint.add(this.tmp);
        this.tmp.copy(this.forward).mulScalar(-this.offset.z);
        this.attachPoint.add(this.tmp);

        this.velocity.copy(car.body.linearVelocity);
        this.angVelocity.copy(car.body.angularVelocity);

        this.wasAccelerating = this.accelerating;
        this.accelerating = car.accelerating;
        this.turning = car.turning;
        this.handbrake = !this.canTurn && car.handbrake; // only backwheels can handbrake
        this.drifting = car.drifting;
        this.topSpeed = car.topSpeed;
    }

    preUpdate(dt, car, wheelAngle) {
        this.dt = dt;

        // update orientation from car
        this.updateFromCar(car);

        // update orientation from wheel angle
        if (this.canTurn) {
            this.setWheelAngle(wheelAngle);
        }

        this.calculateCommon(); // reset forces and store multi-use values

        this.checkGround(); // check if wheel is on the ground
        this.updateSuspension(); // use ground data to update suspension length/position
        this.calculateSuspensionForces();
    }

    
    postUpdate(totalWheelLoad)
    {
        let wheelLoad = this.wheelLoad > 0 ? this.wheelLoad : 0;
        this.wheelLoadFactor = totalWheelLoad === 0 ? 0 : wheelLoad / totalWheelLoad;
        this.wheelLoadFactor = 0.25;
        this.usefulMass = this.mass * this.wheelLoadFactor;

        this.calculateDrivingForces(this.accelerating, totalWheelLoad);
        this.calculateTurningForces(this.turning, totalWheelLoad);

        // update 2 things:
        // the "position", this is the wheel location at the end of the suspension i.e. suspensionlength down from the attachpoint
        // the "contactPoint", this is the point where the base of the wheel is touching the ground. i.e. suspensionlength + radius down from the attachpoint
        
        this.tmp.copy(this.up).mulScalar(this.suspensionLength);
        this.position.copy(this.attachPoint).sub(this.tmp);
        this.tmp.copy(this.up).mulScalar(this.suspensionLength + this.radius);
        this.contactPoint.copy(this.attachPoint).sub(this.tmp);
    }

    setWheelAngle(angle){
        this.wheelAngle = angle;

        // update forward/right
        this.quat.setFromAxisAngle(this.up, this.wheelAngle * pc.math.RAD_TO_DEG);
        this.quat.transformVector(this.forward, this.forward);
        this.right.cross(this.forward, this.up);

    }

    calculateCommon()
    {
        this.speed = this.velocity.length();
        this.longSpeed = this.velocity.dot(this.forward);
        this.longVel.copy(this.forward).mulScalar(this.longSpeed);

        this.latSpeed = this.velocity.dot(this.right);
        this.latVel.copy(this.right).mulScalar(this.latSpeed);

        this.force.set(0,0,0);
        this.traction.set(0,0,0);
        this.brakingForce.set(0,0,0);
        this.lateralForce.set(0,0,0);
        this.suspensionForce.set(0,0,0);

        // magnitude of suspension force.
        this.wheelLoad = 0;
        this.wheelLoadFactor = 0;
        

        let handbrakeFactor = this.handbrake ? this.HANDBRAKE_GRIP_FACTOR : 1; // handbrake locks up wheel and it loses all grip
        let driftingFactor = this.drifting ? this.DRIFT_MODE_GRIP_FACTOR : 1;
        
        let denom  = this.latSpeed + this.longSpeed;
        if (denom !== 0) {
            this.speedRatio = this.latSpeed / denom;
            this.speedRatio = pc.math.clamp(this.speedRatio, -1, 1);    
        } else {
            this.speedRatio = 0;
        }

        // this.grip = 1;
        
        //this.grip = 1 - ratio;

        this.grip = 1 * Math.min(handbrakeFactor, driftingFactor);
        // this.grip = handbrakeFactor * (this.drifting ? this.DRIFTING_GRIP_FACTOR : 1);

        this.parallelVel.sub2(this.velocity, this.parallelVel.copy(this.groundNormal).mulScalar(this.velocity.dot(this.groundNormal)));
    }


    checkGround()
    {
        this.onGround = false;

        let RAY_LENGTH = 10;//this.SUSPENSION_MAX_LENGTH + this.radius + LARGE_EPSILON;
        let GROUND_HEIGHT = this.SUSPENSION_MAX_LENGTH + this.radius + EPSILON;

        this.start.copy(this.attachPoint);
        this.end.copy(this.up).mulScalar(-RAY_LENGTH).add(this.start);
                
        let result = this.system.raycastFirst(this.start, this.end, {
            filterCallback: function (entity) {
                return (!entity.script) || (!entity.script.CarEntity);
            }
        });
        
        this.groundValid = false;
        if (result) {
            this.groundValid = true;
            this.groundPosition.copy(result.point);
            this.groundNormal.copy(result.normal);
            this.groundOffset.sub2(this.attachPoint, this.groundPosition);                

            this.start.sub(result.point);
            if (this.start.length() < GROUND_HEIGHT) {
                this.onGround = true;
            }
        }
    }

    // 
    updateSuspension()
    {
        if (this.dt === 0) return;

        const MAX_SUSPENSION_CHANGE_PER_FRAME = 0.005;

        if (this.onGround) {
            // calculate new suspension length
            this.suspensionLength = this.groundOffset.length() - this.radius;
            // clamp to min/max
            this.suspensionLength = Math.min(Math.max(this.SUSPENSION_MIN_LENGTH, this.suspensionLength), this.SUSPENSION_MAX_LENGTH);
            let suspensionChange = this.suspensionLength - this.prevSuspensionLength;

            // limit expansion past rest length rate of suspension and update onGround
            if (this.suspensionLength > this.SUSPENSION_REST_LENGTH && suspensionChange > MAX_SUSPENSION_CHANGE_PER_FRAME) {
                suspensionChange = MAX_SUSPENSION_CHANGE_PER_FRAME * this.dt;
                this.suspensionLength = this.prevSuspensionLength + suspensionChange;

                // suspension is shorter so now the wheel isn't on the ground
                this.onGround = false;
            }
        } else {
            // suspension slowly reverts to rest length over 0.1s frames
            this.suspensionLength = Math.min(Math.max(this.SUSPENSION_MIN_LENGTH, this.suspensionLength), this.SUSPENSION_MAX_LENGTH);
            this.suspensionLength -= (this.suspensionLength - this.SUSPENSION_MAX_LENGTH) * this.dt / 0.5;
        }                
    }

    getVelocityAtLocalPoint(rigidbody, relPos, outVel)
    {
        outVel.cross(rigidbody.angularVelocity, relPos)
        outVel.add(rigidbody.linearVelocity);
        return outVel;
    }

    calculateSuspensionForces() {   
        if (this.dt === 0) return;

        if (this.onGround) {
            let timestep = this.dt;
            timestep = Math.max(0.067, timestep); // clamp timestep to minimum of 15fps
            let suspensionVel = (this.suspensionLength - this.prevSuspensionLength) / this.dt;
            let extension = (this.suspensionLength - this.SUSPENSION_REST_LENGTH);

            let offset = this.tmp.sub2(this.attachPoint, this.body.entity.getPosition());

            let dampingCoeff = this.SUSPENSION_COMPRESSION_DAMPING;
            if (suspensionVel > 0) dampingCoeff = this.SUSPENSION_EXPANSION_DAMPING; // compression and expansion/relaxation have different damping coeffs

            let damping = dampingCoeff * suspensionVel;
            
            let spring = - this.SUSPENSION_STIFFNESS * extension;
            this.wheelLoad = spring - damping;

            // at high speed the suspension gets very strong if compressed to try and avoid the lower front of the collision hitting obstacles
            // if (this.speed > 20) {                
            //     let MIN_SUSPENSION = 0.05;
            //     let suspensionRemaining = this.suspensionLength - this.SUSPENSION_MIN_LENGTH;
            //     if (suspensionRemaining < MIN_SUSPENSION) {
            //         this.wheelLoad *= MIN_SUSPENSION / Math.max(suspensionRemaining, 0.01);
            //     }
            // }

            this.suspensionForce.copy(this.up).mulScalar(this.wheelLoad);
        } else {
            // do nothing when wheel is off the ground
        }
    

        this.prevSuspensionLength = this.suspensionLength;
    }

    calculateDrivingForces(dir)
    {
        if (!this.onGround) return;

        // TODO: fix this because it should only switch from accel to braking if you have let off the accelerator
        let accelerating = (dir > 0 && this.longSpeed >= -EPSILON); // accelerating forward and moving forward
        let reversing = (dir < 0 && this.longSpeed <= EPSILON); // accelerating in reverse and moving backward
        let braking = (!accelerating && !reversing) && (dir > 0 && this.longSpeed <= EPSILON) || (dir < 0 && this.longSpeed >= -EPSILON); // braking - accelerating in opposite direction to movement
        
        // if (accelerating || braking || reversing) {
        //     console.log(`acc: ${accelerating} | reverse: ${reversing} | braking: ${braking}`);
        // }
        
        if (this.powered && (accelerating || reversing)) {
            this.traction.copy(this.forward);
            
            const MPH_TO_MS = 1 / 2.237;
            const topSpeedMs = this.topSpeed * MPH_TO_MS;

            // Get position along ACCEL_CURVE based on distance towards top speed
            let ratio = Math.abs(this.longSpeed / topSpeedMs); // (0 when not moving forward, 1 when at top speed)
            let force = this.grip * this.wheelLoadFactor * this.ACCEL * this.evaluateAccelerationCurve(ratio); // curve is normalized: 0-1 is speed -> 0-1 accel force
            this.traction.mulScalar(dir * force);
        }  else if (braking) {
            if (this.speed > EPSILON) {
                // TODO: make this a curve evaluation ?
                this.brakingForce.copy(this.forward).mulScalar(dir * this.BRAKE);
            } else {
                this.velocity.copy(pc.Vec3.ZERO);
                // TODO: update body?
            }
        } else {

        }
    }

    evaluateAccelerationCurve (t) {
        return this.ACCEL_CURVE.value(t);
    }


    calculateTurningForces(dir)
    {   
        if (!this.onGround) {
            this.skidding = false;
            return;
        }

        this.calculateSlipAngle();

        if (Math.abs(this.slipAngle) > EPSILON) {
            this.calculateLateralForce();
        }
    }

    calculateLateralForce()
    {  
        if (this.dt === 0) return;

        this.lateralForce.copy(this.right).mulScalar(this.evaluateLateralForceCurve(this.slipAngle));

        // should we add this to latSpeed? 
        let rotationSpeed = this.angVelocity.y * this.offset.z;

        // lateral friction clamp
        let maxForceMag = Math.abs(this.usefulMass * (this.latSpeed) / this.dt);
        if (this.lateralForce.length() > maxForceMag) {
            this.lateralForce.normalize().mulScalar(maxForceMag);
        }
    }

    calculateSlipAngle()
    {
        if (this.speed > EPSILON) {
            // let frontRotational = this.angVelocity.y * this.offset.z;
            let rotationSpeed = this.angVelocity.y * this.offset.z;
    
            this.slipAngle = Math.atan2(this.latSpeed + rotationSpeed,  Math.abs(this.longSpeed));

            // const MIN_SKID_SPEED = 3;
            // if (Math.abs(this.latSpeed + rotationSpeed) > MIN_SKID_SPEED ) {

            let slipping = Math.abs(this.slipAngle) > (30*pc.math.DEG_TO_RAD) && Math.abs(this.latSpeed + rotationSpeed) > 3;
            if (this.handbrake || slipping) {
                this.skidding = true;
            } else {
                this.skidding = false;
            }
        } else {
            this.slipAngle = 0;
            this.skidding = false;
        }
    }

    evaluateLateralForceCurve(slipAngle) //
    {
        // normalize slipAngle to curve 0->1
        let t = 0.5 + (slipAngle / (Math.PI / 2));
        t = Math.min(Math.max(t, 0), 1);
        
        let normalizedLateralForce = this.GRIP_CURVE.value(t);
        this.body.entity._app.fire("debug:display", "debug:fuel", normalizedLateralForce);
        // const PEAK_SLIP = 0.052; // 3 deg is peak for curve
        // // simple formula slope with a flat max after Peak
        // if (slipAngle > 0) {
        //     slipAngle = Math.min(PEAK_SLIP, slipAngle);
        // }
        // if (slipAngle < 0) {
        //     slipAngle = Math.max(-PEAK_SLIP, slipAngle);
        // }
        
        // if (this.canTurn) {
        //     console.log(`sa${slipAngle}:t${t}:n${normalizedLateralForce}`);
        // }
        return -1 * this.grip * this.CORNERING_STIFFNESS * normalizedLateralForce;
    }




}