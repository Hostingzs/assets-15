// import * as pc from "../../../../engine/build/playcanvas.mjs";
const QUADTREE_MIN_SIZE = 1;

class Quadtree {
    /**
     * Represents a Quadtree node with a center, size, children, and data.
     * @param {pc.Vec3} center - The center point of the node.
     * @param {pc.Vec3} size - The dimensions of the node.
     * @param {any} data - The data to be stored at this node.
     */
    constructor(center, size, data = null) {
        this.center = center.clone(); // Center point of the node
        this.size = size.clone(); // Dimensions of the node
        this.children = []; // Child nodes
        this.data = []; // Data stored at this node
        if (data) this.data.push(data);
        
        this.tmp = new pc.Vec3();
        this.halfSize = new pc.Vec3(size.x / 2, 0, size.z / 2);
        this.quarterSize = this.halfSize.clone().scale(0.5);
    }

    /**
     * Subdivides the current node into 4 children, each with half the size of the current node.
     */
    subdivide() {
        for (let x = -1; x <= 1; x += 2) {
            for (let z = -1; z <= 1; z += 2) {
                const offset = new pc.Vec3(x, 0, z).mul(this.quarterSize);
                const childCenter = this.center.clone().add(offset);
                this.children.push(new Quadtree(childCenter, this.halfSize));
            }
        }
    }

    /**
     * Inserts data into the appropriate child of the quadtree.
     * @param {pc.Vec3} point - The point associated with the data.
     * @param {any} data - The data to be inserted.
     */
    insert(point, data) {
        if (this.size.x < QUADTREE_MIN_SIZE) {
            this.data.push(data);
            return;
        }

        if (this.children.length === 0) {
            this.subdivide();
        }

        for (let child of this.children) {
            if (child.contains(point)) {
                child.insert(point, data);
                return;
            }
        }
    }

    contains(point) {
        return (
            point.x >= this.center.x - this.size.x / 2 && point.x <= this.center.x + this.size.x / 2 &&
            point.z >= this.center.z - this.size.z / 2 && point.z <= this.center.z + this.size.z / 2
        );
    }
    
    findAll(point, radius) {
        const results = [];
        const queue = [this];

        while (queue.length > 0) {
            const node = queue.shift();

            let sx = (node.size.x / 2) + radius;

            if (point.x - node.center.x > sx) continue;
            if (point.x - node.center.x < -sx) continue;
            if (point.z - node.center.z > sx) continue;
            if (point.z - node.center.z < -sx) continue;

            if (node.data.length > 0) {
                results.push(...node.data);
            }
            if (node.children.length > 0) {
                queue.push(...node.children);
            }
        }

        return results;
    }
}
