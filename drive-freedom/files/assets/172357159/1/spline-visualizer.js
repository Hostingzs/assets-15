class SplineVisualizer {
    constructor(app, step = 0.05) {
        this.app = app;
        // this.color = color;
        this.step = step;
    }

    draw(spline, color) {
        let tmp1 = new pc.Vec3();
        let tmp2 = new pc.Vec3();
        let incr = this.step/spline.segments;
        for (let t = 0; t < 1; t += incr) {
            let startPoint = spline.getPointAt(t, tmp1);
            let endPoint = spline.getPointAt(t + incr, tmp2);
            this.app.drawLine(startPoint, endPoint, color);
        }

        spline.points.forEach((point) => {
            this.drawCross(point, pc.Vec3.UP, 0.1, color);
        })
    }
    
    drawCross(pos, up, size, color)
    {
        let _up = up.clone();
        let forward = new pc.Vec3().cross(up, pos);
        if (forward.length() < 0.01) return;
        
        forward.normalize();
        let right = new pc.Vec3().cross(forward, up);
        forward.mulScalar(0.5 * size);
        right.mulScalar(0.5 * size);
        _up.mulScalar(0.5 * size);

        let start = new pc.Vec3().copy(pos).sub(forward);
        let end = new pc.Vec3().copy(pos).add(forward);
        this.app.drawLine(start, end, color);

        start.copy(pos).sub(right);
        end.copy(pos).add(right);
        this.app.drawLine(start, end, color);

        start.copy(pos).sub(_up);
        end.copy(pos).add(_up);
        this.app.drawLine(start, end, color);

    }
}