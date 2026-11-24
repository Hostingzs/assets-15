class SplineIterator {
    _t = 0; // current position on spline
    _segment = 0; // current segment on spline
    _length = -1; // length (in units or meters)
    spline = null;
    _tmp = new pc.Vec3();
    _start = new pc.Vec3();
    _current = new pc.Vec3();

    constructor()
    {
    }

    setSpline (spline) {
        this.spline = spline;
        this._t = 0;
        this._segment = 0;
    }

    // move along spline by dt
    iterate(dt) {
        if (this._t + dt > 1) {
            this._t = 1;
            dt -= 1;
        } else {
            this._t += dt;
            dt = 0;
        }

        if (dt > 0) {
            this.iterate(dt);
        }
    } 
    
    move(d) {
        let length = this.spline.length();
        let dt = d / length;
        let step = dt * 0.01;

        let distance = 0;
        this.spline.getPointAt(this._t, this._start);
        while (distance < d && this._t <= 1) {
            this._t += step;
            this.spline.getPointAt(this._t, this._current);
            this._tmp.sub2(this._current, this._start);
            distance += this._tmp.length();
            this._start.copy(this._current);
        }
        
    }
    
    getPoint(out) {
        return this.spline.getPointAt(this._t, out);
    }
}


if (typeof exports !== 'undefined') {
    module.exports = SplineIterator;
}