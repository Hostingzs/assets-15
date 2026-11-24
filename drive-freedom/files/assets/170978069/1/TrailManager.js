

const TrailManagerState = {
    OFF: 0,
    BACKFILL: 1,
    ON: 2
};

class TrailManager {
    constructor(app, texture, max) {
        this.app = app;
        
        this.state = TrailManagerState.OFF;

        // for updating
        this.lastPosition = new pc.Vec3();
        this.offset = new pc.Vec3();
        
        this.vOffset = 0.01;

        // trail is the list of points that form the trail
        this.trail = [];
        this.count = 0;
        for (let i = 0; i < max+1; i++) {
            this.trail.push(new pc.Vec3());
        }

        // index of next decal to create
        this.currentIndex = 0;

        // Allocate space for quads
        this.numDecals = max;
        this.numDecalVertices = 4 * this.numDecals;

        // Allocate storage for vertex positions, vertex stores x, y and z
        this.positions = new Float32Array(3 * this.numDecalVertices);

        // Allocate storage for vertex normals, vertex stores x, y and z
        this.normals = new Float32Array(3 * this.numDecalVertices);

        // Allocate storage for colors, each vertex stores r, g, b and a
        this.colors = new Uint8ClampedArray(4 * this.numDecalVertices);

        // Allocate storage for uvs, each vertex stores u and v. And fill them up to display whole texture
        this.uvs = [];
        for (let i = 0; i < this.numDecals; i++) this.uvs.push(0, 0, 0, 1, 1, 1, 1, 0);

        // Allocate and generate indices. Each quad is representing using 2 triangles, and uses 4 vertices
        const quadTriangles = [0, 1, 2, 2, 3, 0];
        this.indices = new Uint16Array(6 * this.numDecals);
        for (let i = 0; i < this.numDecals; i++) {
            this.indices[6 * i + 0] = 4 * i + quadTriangles[0];
            this.indices[6 * i + 1] = 4 * i + quadTriangles[1];
            this.indices[6 * i + 2] = 4 * i + quadTriangles[2];
            this.indices[6 * i + 3] = 4 * i + quadTriangles[3];
            this.indices[6 * i + 4] = 4 * i + quadTriangles[4];
            this.indices[6 * i + 5] = 4 * i + quadTriangles[5];
        }

        // Create a mesh with dynamic vertex buffer and static index buffer
        this.mesh = new pc.Mesh(this.app.graphicsDevice);
        this.mesh.clear(true, false);
        this.updateMesh(true, true, true, true);


        if (texture && !(texture instanceof pc.Texture)) {
            console.error("invalid texture object, use texture not asset?");
            return;
        }

        // create material
        this.material = new pc.StandardMaterial();
        this.material.useLighting = true;
        this.material.diffuseMap = texture;
        this.material.diffuseTint = true;
        this.material.diffuse = new pc.Color(0,0,0);
        // // this.material.emissiveVertexColor = true;
        this.material.blendType = pc.BLEND_NORMAL; 
        this.material.depthWrite = false; // optimization - no need to write to depth buffer, as decals are part of the ground plane
        // // this.material.emissiveMap = texture;
        this.material.opacityMap = texture;
        this.material.opacityMapChannel = "r";
        this.material.opacity = 0.75;
        this.material.depthBias = -0.2; // depth biases to avoid z-fighting with ground plane
        this.material.slopeDepthBias = -0.2;
        this.material.update();    

        // Create the mesh instance
        this.meshInstance = new pc.MeshInstance(this.mesh, this.material);

        // temp vectors
        this._f = new pc.Vec3();
        this._u = new pc.Vec3();
        this._r = new pc.Vec3();
        this._p = [new pc.Vec3(), new pc.Vec3(), new pc.Vec3(), new pc.Vec3()];
        this._n = [new pc.Vec3(), new pc.Vec3(), new pc.Vec3(), new pc.Vec3()];

        this.createEntity();
    }

    createEntity () {
        // Create Entity with a render component to render the mesh instance
        const entity = new pc.Entity();
        entity.addComponent('render', {
            type: 'asset',
            meshInstances: [this.meshInstance],
            layers: [this.app.scene.layers.getLayerByName("VFX").id],
            castShadows: false
        });
        this.app.root.addChild(entity);
        return entity;
    }

    start (width, point, normal) {
        this.trail[this.count].copy(point);

        this._p[1].copy(point);
        this._p[2].copy(point);

        this.count++;
        if (this.count >= this.trail.length) {
            this.count = 0;
        }

        this.state = TrailManagerState.BACKFILL;
    }
    
    // go back and set the width on the initial two points
    backfill (width, point, normal) {
        let curr = this.count;
        let prev = this.count - 1; 
        if (prev < 0) prev = this.trail.length-1;

        // now we have a new point, got back and update the prev points with a width
        this._f.copy(point).sub(this.trail[prev]); // forward is from previous to current point
        this._u.copy(normal);
        this._r.cross(this._f, this._u);

        let hw = width / 2;
        this._r.mulScalar(hw);

        this._p[1].add(this._r);
        this._p[2].sub(this._r);

        this.state = TrailManagerState.ON;
    }

    stop () {
        // this.started = false;
        this.state = TrailManagerState.OFF;
    }

    add (width, point, normal) {
        if (this.state === TrailManagerState.OFF) {
            this.start(width, point, normal);
            return;
        } else if (this.state === TrailManagerState.BACKFILL) {
            this.backfill(width, point, normal);
        }

        let curr = this.count;
        let prev = this.count - 1; 
        if (prev < 0) prev = this.trail.length-1;

        this.trail[curr].copy(point);

        // generate basis
        this._f.copy(point).sub(this.trail[prev]); // forward is from previous to current point
        this._u.copy(normal);
        this._r.cross(this._f, this._u);

        let hw = width / 2;
        this._r.mulScalar(hw);

        // bias position up a little to prevent z-fighting
        this._u.mulScalar(this.vOffset); 

        // if this isn't the first part of a trail set first points to last two of previous quad
        // otherwise we only set two points
        this._p[0].copy(this._p[1]);
        this._p[3].copy(this._p[2]);    
        this._p[1].copy(point).add(this._r).add(this._u);
        this._p[2].copy(point).sub(this._r).add(this._u);

        for (var i = 0; i < 4; i++) {
            this._n[i].copy(normal);
        }
        
        this.createDecalInternal(this.currentIndex, this._p, this._n);
        
        this.count++;
        // recycle back to start
        if (this.count >= this.trail.length) {
            this.count = 0;
        }

        this.currentIndex++;
        if (this.currentIndex >= this.numDecals) {
            this.currentIndex = 0;
        }

        // this.started = true;
    }

    // update trail with new point 
    // use this as it checks to make sure quads are large enough
    update (width, point, normal) {
        var MIN_OFFSET = 0.5;

        this.offset.sub2(this.lastPosition, point);

        if (this.state === TrailManagerState.OFF || this.offset.length() > MIN_OFFSET) {
            this.add(width, point, normal);
            this.lastPosition.copy(point);
            // if (!this.started) {
            //     this.start(point);
            // } else {
            //     this.add(width, point, normal);
            //     this.lastPosition.copy(point);
            // }
        }
    }

    /**
     * Helper function to generate a decal with index i at position
     * pos. It fills up information for all 4 vertices of a quad.
     * @param {number} i - The decal index.
     * @param {pc.Vec3} points - 4 points of the decal
     * * @param {pc.Vec3} normals - 4 normals one for each point
     */
    createDecalInternal(i, points, normals) {
        if (points.length !== 4) {
            console.error("invalid size for decal quad, must be 4 points");
            return;
        }
        // random size and rotation angle
        const size = 0.5 + Math.random();
        let angle = Math.random() * Math.PI;

        // random color
        const r = Math.random() * 255;
        const g = Math.random() * 255;
        const b = Math.random() * 255;

        for (let j = 0; j < 4; j++) {
            this.colors[i * 16 + j * 4 + 0] = r;
            this.colors[i * 16 + j * 4 + 1] = g;
            this.colors[i * 16 + j * 4 + 2] = b;
            this.colors[i * 16 + j * 4 + 3] = 0; // alpha is not used by shader
        }

        for (let k = 0; k  < 4; k++) {
            this.positions [12 * i + (3*k) + 0] = points[k].x;
            this.positions [12 * i + (3*k) + 1] = points[k].y;
            this.positions [12 * i + (3*k) + 2] = points[k].z;

            this.normals [12 * i + (3*k) + 0] = normals[k].x;
            this.normals [12 * i + (3*k) + 1] = normals[k].y;
            this.normals [12 * i + (3*k) + 2] = normals[k].z;

        }
        this.updateMesh(true, true, true, false);
    }

    /**
     * Helper function to update required vertex streams.
     * @param {boolean} updatePositions - Update positions.
     * @param {boolean} updateColors - Update colors.
     * @param {boolean} [initAll] - Set UV's and indices.
     */
    updateMesh(updatePositions, updateNormals, updateColors, initAll) {
        // update positions when needed
        if (updatePositions) this.mesh.setPositions(this.positions);

        if (updateNormals) this.mesh.setNormals(this.normals);

        // update colors when needed
        if (updateColors) this.mesh.setColors32(this.colors);

        // update indices and uvs only one time, as they never change
        if (initAll) {
            this.mesh.setIndices(this.indices);
            this.mesh.setUvs(0, this.uvs);
        }

        this.mesh.update(pc.PRIMITIVE_TRIANGLES);
    }

    destroy() {
        this.positions = null;
        this.colors = null;
        this.indices = null;

        this.material.destroy();
        this.meshInstance.destroy();
        this.mesh.destroy();
        this.entity.destroy();
    }
};