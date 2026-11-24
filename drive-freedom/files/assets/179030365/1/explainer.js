// ACCELERATION
// Applied per wheel
// An accel curve is defined which is between y=0-1 and x=0-1. In general it slopes down from y=1 @ x=0 and y=0 @ x=1
// The curve is sampled at x = (currSpeed/topSpeed) so that y gets smaller as you approach top speed
// y is multiplied by ACCEL. So at low speed you have high force, and that force reduces as you approach top speed

// BRAKING
// Applied per wheel
// Braking force is simply a force of magnitude BRAKE applied in reverse motion direction

// RR
// Applied per wheel
// Rolling Resistance is applied while in contact with the ground and not accelerating, it is applied in direction of wheel facing

// DRAG COEFF
// Applied per wheel
// Drag is applied in opposite direction to motion, proportional to speed squared


let example = {
    "DEBUG_RENDER": false, // enable debug rendering
    "POWERED_WHEELS": [false, false, true, true], // FL,FR,RL,RR - which wheels are powered (so you can do fwd, rwd and awd)
    "TOP_SPEED": 120, // Max top speed, accel curve will be sampled at (currSpeed/topSpeed) so it's impossible to go over top speed
    "ACCEL": 30000, // see above
    "BRAKE": 10000, // see above
    "RR_COEFF": 50000, // see above
    "DRAG_COEFF": 0.5, // see above
    "WHEEL_ANGLE_MAX": 30, // Max angle in degrees the front wheels can be turned
    "WHEEL_RADIUS": [0.35,0.35,0.4,0.4], // size of wheels in m
    "TURN_SPEED": 60, // angles/sec that the wheels will turn when the turn key is pressed
    "GRIP": [1,1,1,1], // Not Used??? Grip Curve instead - multiplier per wheel on grip - 0=no grip ever, 1=normal grip
    "ROLL_INFLUENCE": 0.0, // amount that acceleration will roll the car 0=no roll. We implement fake roll, and this should stay 0
    "ROLL_MIN": -10, // Fake roll is clamped between ROLL_MIN/ROLL_MAX in degrees
    "ROLL_MAX": 10,  // Fake roll is clamped between ROLL_MIN/ROLL_MAX in degrees
    "ROLL_FACTOR": 10, // Multiplier of magnitude of force on Fake Roll
    "ROLL_K": 40000, // Spring co-efficient for Fake Roll
    "CORNERING_STIFFNESS": 10000, // Affects how much cornering force can be applied by the wheel, higher means more corning ability, lower means more sliding
    "SUSPENSION_STIFFNESS": 80000, // How much force the suspension can apply to support the vehicle
    "SUSPENSION_COMPRESSION_FACTOR": 0.5, // Factor applied when suspension is shortening
    "SUSPENSION_EXPANSION_FACTOR": 0.6, // Factor applied when suspension is lengthening
    "SUSPENSION_REST_LENGTH": 0.4, // Length of suspension with no forces applied
    "SUSPENSION_MIN_LENGTH": 0.1, // Min length of suspension
    "SUSPENSION_MAX_LENGTH": 0.6, // Max lenght of suspension
    "DRIFT_YAW_FORCE": 30000, // Max available force to apply to the rotate the car when turning while skidding - used proportionally to speedRatio (lat/(lat+long)) when turning while moving sideways
    "DRIFT_MODE_MIN_SPEED": 10, // not used
    "DRIFT_MODE_DISABLE_SPEED": 0.5, // not used
    "HANDBRAKE_GRIP_FACTOR": 0.1, // Grip multiplier when handbrake is enabled
    "DRIFT_MODE_GRIP_FACTOR": 0.1, // not used
    "FUEL_CAPACITY": 100, // max amount of fuel
    "FUEL_USAGE_RATE": 1, // fuel usage per second
    "MAX_HEALTH": 100 // max amount of health

}