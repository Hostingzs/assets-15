// framerate independent lerp from source to target
// smoothing, 0 never change, 1 change immediately to target
function damp(source, target, smoothing, dt) {
    let invsm = 1 - smoothing;
    return pc.math.lerp(source, target, 1 - Math.pow(invsm, dt));
}

function dampVec(out, source, target, smoothing, dt) {
    let invsm = 1 - smoothing;
    return out.lerp(source, target, 1 - Math.pow(invsm, dt));
}