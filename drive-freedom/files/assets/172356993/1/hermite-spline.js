class HermiteSpline {
    size = 0;
    points = [];
    tangents = [];
    _length = -1;
    tmp = new pc.Vec3();
    constructor() {

    }

    get segments() {
        return this.points.length -1 ;
    }

    clear() {
        this.size = 0;
        this._length = -1;
        this.points.length = 0;
        this.tangents.length = 0;
    }

    // clear any cached values
    invalidate() {
        this._length = -1;
    }

    serialize() {
        // output a text serialization 

        let pointsArray = [];
        let tangentsArray = [];
        this.points.forEach((p) => {pointsArray.push(p.x); pointsArray.push(p.y); pointsArray.push(p.z);})
        this.tangents.forEach((t) => {tangentsArray.push(t.x); tangentsArray.push(t.y); tangentsArray.push(t.z);})

        return JSON.stringify({
            type: "hermite",
            size: this.size,
            points: pointsArray,
            tangents: tangentsArray
        });
    }

    deserialize(data) {
        this.clear();
        try {
            // JSON asset resources are pre-parsed, but we should also support loading directly from a string
            let obj = data;
            if (typeof(data) === 'string') {
                obj = JSON.parse(data);
            }
            
            if (obj.type !== "hermite") { throw Error("invalid spline format");}
            if ((obj.size * 3) !== obj.points.length || (obj.size * 3) !== obj.tangents.length) {throw Error("invalid length of points or tangents");}

            this.size = obj.size;
            for (let i = 0; i < obj.size; i++) {
                this.points.push(new pc.Vec3(obj.points[3*i + 0],
                                            obj.points[3*i + 1],
                                            obj.points[3*i + 2]));
                this.tangents.push(new pc.Vec3(obj.tangents[3*i + 0],
                                            obj.tangents[3*i + 1],
                                            obj.tangents[3*i + 2]));    
            }
        } catch (e) {
            console.error(e);
        }
        
    }

    addPoint(point, tangent) {
        this.points.push(point);
        this.tangents.push(tangent);
        this.size++;
    }

    getPointAt(t, out) {
        t = Math.min(Math.max(t, 0), 1); // clamp t

        let segmentCount = this.segments
        if (segmentCount < 1) {
            console.error("Not enough points.");
            return null;
        }

        let segmentLength = 1 / segmentCount;
        let segmentIndex = Math.min(Math.floor(t / segmentLength), segmentCount - 1);
        let localT = (t - segmentLength * segmentIndex) / segmentLength;

        let p0 = this.points[segmentIndex];
        let p1 = this.points[segmentIndex + 1];
        let m0 = this.tangents[segmentIndex];
        let m1 = this.tangents[segmentIndex + 1];

        let h00 = (2 * Math.pow(localT, 3)) - (3 * Math.pow(localT, 2)) + 1;
        let h10 = Math.pow(localT, 3) - (2 * Math.pow(localT, 2)) + localT;
        let h01 = (-2 * Math.pow(localT, 3)) + (3 * Math.pow(localT, 2));
        let h11 = Math.pow(localT, 3) - Math.pow(localT, 2);

        let x = h00 * p0.x + h10 * m0.x + h01 * p1.x + h11 * m1.x;
        let y = h00 * p0.y + h10 * m0.y + h01 * p1.y + h11 * m1.y;
        let z = h00 * p0.z + h10 * m0.z + h01 * p1.z + h11 * m1.z;
        out.set(x,y,z);
        
        return out;
    }

    getSegmentPointAt(segment, t, out) {
        t = Math.min(Math.max(t, 0), 1); // clamp t

        let p0 = this.points[segment];
        let p1 = this.points[segment + 1];
        let m0 = this.tangents[segment];
        let m1 = this.tangents[segment + 1];

        let h00 = (2 * Math.pow(t, 3)) - (3 * Math.pow(t, 2)) + 1;
        let h10 = Math.pow(t, 3) - (2 * Math.pow(t, 2)) + t;
        let h01 = (-2 * Math.pow(t, 3)) + (3 * Math.pow(t, 2));
        let h11 = Math.pow(t, 3) - Math.pow(t, 2);

        let x = h00 * p0.x + h10 * m0.x + h01 * p1.x + h11 * m1.x;
        let y = h00 * p0.y + h10 * m0.y + h01 * p1.y + h11 * m1.y;
        let z = h00 * p0.z + h10 * m0.z + h01 * p1.z + h11 * m1.z;
        out.set(x,y,z);
        
        return out;
    }

    length () {
        if (this._length >= 0) {
            return this._length;
        }

        let seg = 0;
        let t = 0;
        let len = 0;
        let p = new pc.Vec3();
        let lp = new pc.Vec3();
        let tmp = new pc.Vec3();
        this.getSegmentPointAt(seg, t, lp); // initialize last pos to origin
        
        while (seg !== this.segments && t < 1) {
            p = this.getSegmentPointAt(seg, t, p);
            tmp.sub2(p, lp);
            len += tmp.length()
            lp.copy(p);
            t += 0.01;
            if (t >= 1) {
                t -=1 ;
                p = this.getSegmentPointAt(seg, 1, p);
                tmp.sub2(p, lp);
                len += tmp.length();
                lp.copy(p);
                t = 0;
                seg++;
            }
        }

        this._length = len;
        return len;
    }
}

if (typeof exports !== 'undefined') {
    module.exports = HermiteSpline;
}