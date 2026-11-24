
class CatmullRomSpline {
    constructor() {
        this.points = [];
    }

    addPoint(point) {
        this.points.push(point);
    }

    get segments() {
        return Math.max(this.points.length - 3, 0);
    }

    getPointAt(t, out) {
        if (this.points.length < 4) {
            console.error("Not enough points.");
            return null;
        }

        // Ensure t is within the valid range [0, 1]
        t = Math.max(Math.min(t, 1), 0);

        let p = this.points;
        let pointCount = p.length;
        let segmentCount = pointCount - 3;
        let adjustedT = t * segmentCount;
        let intPoint = Math.floor(adjustedT);
        let weight = adjustedT - intPoint;

        // Calculate indices of the four points for the segment
        intPoint = intPoint + 1; // Adjust index because the first segment starts at the second point
        let i0 = Math.max(intPoint - 1, 0);
        let i1 = intPoint;
        let i2 = Math.min(intPoint + 1, pointCount - 1);
        let i3 = Math.min(intPoint + 2, pointCount - 1);

        let p0 = p[i0];
        let p1 = p[i1];
        let p2 = p[i2];
        let p3 = p[i3];

        // Catmull-Rom to Hermite conversion
        let tension = 0.5; // Common choice for Catmull-Rom
        let m0 = p1.clone().sub(p0).scale(tension);
        let m1 = p2.clone().sub(p1).scale(tension);
        let m2 = p3.clone().sub(p2).scale(tension);
        let m3 = p2.clone().sub(p1).scale(tension);

        // Calculate the Hermite basis functions
        let h00 = (2 * Math.pow(weight, 3)) - (3 * Math.pow(weight, 2)) + 1;
        let h10 = Math.pow(weight, 3) - (2 * Math.pow(weight, 2)) + weight;
        let h01 = (-2 * Math.pow(weight, 3)) + (3 * Math.pow(weight, 2));
        let h11 = Math.pow(weight, 3) - Math.pow(weight, 2);

        // Interpolate the position
        let x = h00 * p1.x + h10 * m0.x + h01 * p2.x + h11 * m1.x;
        let y = h00 * p1.y + h10 * m0.y + h01 * p2.y + h11 * m1.y;
        let z = h00 * p1.z + h10 * m0.z + h01 * p2.z + h11 * m1.z;

        out.set(x, y, z);

        return out;
    }
}

